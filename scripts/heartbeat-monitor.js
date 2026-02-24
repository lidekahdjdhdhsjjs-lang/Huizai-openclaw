#!/usr/bin/env node
/**
 * 心跳监控 - Heartbeat Monitor
 * 每5分钟检查系统健康状态
 * 
 * 检查项:
 *   1. Gateway状态
 *   2. Discord连接
 *   3. 内存使用
 *   4. 磁盘空间
 *   5. Cron任务执行状态
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const HEARTBEAT_FILE = path.join(OPENCLAW_DIR, 'workspace', 'memory', 'heartbeat-state.json');
const ALERTS_FILE = path.join(OPENCLAW_DIR, 'workspace', 'memory', 'alerts.json');

// 获取当前状态
function getSystemStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    components: {},
    alerts: [],
    metrics: {}
  };

  // 1. 检查Gateway进程
  try {
    const gatewayProcess = execSync('pgrep -f "openclaw.*gateway" || true', { encoding: 'utf8' }).trim();
    status.components.gateway = gatewayProcess ? 'running' : 'stopped';
  } catch (e) {
    status.components.gateway = 'unknown';
  }

  // 2. 检查Discord连接
  try {
    const discordProcess = execSync('pgrep -f "discord" || true', { encoding: 'utf8' }).trim();
    status.components.discord = discordProcess ? 'connected' : 'disconnected';
  } catch (e) {
    status.components.discord = 'unknown';
  }

  // 3. 内存使用
  try {
    const memInfo = execSync('free -m | grep Mem', { encoding: 'utf8' });
    const parts = memInfo.split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const usage = Math.round((used / total) * 100);
    
    status.metrics.memory = {
      total: total,
      used: used,
      usage: usage,
      status: usage > 90 ? 'critical' : usage > 75 ? 'warning' : 'ok'
    };

    if (usage > 90) {
      status.alerts.push({
        level: 'critical',
        component: 'memory',
        message: `内存使用率 ${usage}%`
      });
    }
  } catch (e) {
    status.metrics.memory = { status: 'unknown' };
  }

  // 4. 磁盘空间
  try {
    const diskInfo = execSync('df -h / | tail -1', { encoding: 'utf8' });
    const parts = diskInfo.split(/\s+/);
    const usage = parseInt(parts[4]);
    
    status.metrics.disk = {
      total: parts[1],
      used: parts[2],
      usage: usage,
      status: usage > 90 ? 'critical' : usage > 75 ? 'warning' : 'ok'
    };

    if (usage > 90) {
      status.alerts.push({
        level: 'critical',
        component: 'disk',
        message: `磁盘使用率 ${usage}%`
      });
    }
  } catch (e) {
    status.metrics.disk = { status: 'unknown' };
  }

  // 5. 检查Cron任务状态
  try {
    const cronFile = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
    const cronData = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
    
    const recentErrors = cronData.jobs.filter(j => 
      j.state?.consecutiveErrors > 0
    );
    
    status.metrics.cron = {
      total: cronData.jobs.length,
      enabled: cronData.jobs.filter(j => j.enabled).length,
      recentErrors: recentErrors.length,
      status: recentErrors.length > 3 ? 'warning' : 'ok'
    };

    if (recentErrors.length > 0) {
      status.alerts.push({
        level: 'warning',
        component: 'cron',
        message: `${recentErrors.length} 个任务有错误`
      });
    }
  } catch (e) {
    status.metrics.cron = { status: 'unknown' };
  }

  // 6. 检查Foundry学习状态
  try {
    const learningsFile = path.join(OPENCLAW_DIR, 'foundry', 'learnings.json');
    const stat = fs.statSync(learningsFile);
    const age = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    
    status.components.foundry = {
      status: age < 24 ? 'active' : 'stale',
      lastUpdate: stat.mtime
    };
  } catch (e) {
    status.components.foundry = { status: 'unknown' };
  }

  return status;
}

// 主函数
function main() {
  console.log('=== 心跳监控 ===');
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const status = getSystemStatus();

  // 输出状态
  console.log('组件状态:');
  Object.entries(status.components).forEach(([name, data]) => {
    const s = typeof data === 'object' ? data.status : data;
    const icon = s === 'running' || s === 'connected' || s === 'active' || s === 'ok' 
      ? '✅' : s === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${name}: ${s}`);
  });

  console.log('\n系统指标:');
  if (status.metrics.memory?.usage) {
    const icon = status.metrics.memory.status === 'ok' ? '✅' : 
                 status.metrics.memory.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} 内存: ${status.metrics.memory.usage}% (${status.metrics.memory.used}/${status.metrics.memory.total}MB)`);
  }
  if (status.metrics.disk?.usage) {
    const icon = status.metrics.disk.status === 'ok' ? '✅' : 
                 status.metrics.disk.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} 磁盘: ${status.metrics.disk.usage}%`);
  }
  if (status.metrics.cron?.total) {
    const icon = status.metrics.cron.status === 'ok' ? '✅' : '⚠️';
    console.log(`  ${icon} Cron: ${status.metrics.cron.enabled}/${status.metrics.cron.total} 启用, ${status.metrics.cron.recentErrors} 错误`);
  }

  // 告警
  if (status.alerts.length > 0) {
    console.log('\n⚠️ 告警:');
    status.alerts.forEach(a => {
      console.log(`  [${a.level}] ${a.component}: ${a.message}`);
    });
  }

  // 保存状态
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(status, null, 2));
  console.log(`\n状态已保存: ${HEARTBEAT_FILE}`);

  // 保存告警
  if (status.alerts.length > 0) {
    let alerts = { entries: [] };
    if (fs.existsSync(ALERTS_FILE)) {
      alerts = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    }
    alerts.entries.push({
      timestamp: status.timestamp,
      alerts: status.alerts
    });
    // 只保留最近50条
    if (alerts.entries.length > 50) {
      alerts.entries = alerts.entries.slice(-50);
    }
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
  }

  return status;
}

main();
