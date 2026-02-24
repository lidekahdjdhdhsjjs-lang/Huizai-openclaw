#!/usr/bin/env node

/**
 * 记忆系统守护进程
 * 功能: 监控OpenClaw/记忆系统,异常时自动回滚
 * 运行方式: systemd独立运行,不依赖OpenClaw
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, spawn } from 'child_process';

// 配置
const CONFIG = {
  memoryDir: '/home/li/.openclaw/workspace/memory',
  scriptsDir: '/home/li/.openclaw/workspace/memory/scripts',
  backupDir: '/home/li/.openclaw/workspace/memory/backups',
  maxBackups: 10,
  checkInterval: 60000, // 1分钟
  openclawPort: 18789,
  maxFailures: 3
};

// 状态
let failureCount = 0;
let lastBackupTime = 0;

// 日志
function log(level, msg) {
  const time = new Date().toISOString();
  console.log(`[${time}] [${level}] ${msg}`);
}

// 备份
function backup() {
  log('INFO', '开始备份...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(CONFIG.backupDir, `backup-${timestamp}`);
  
  try {
    mkdirSync(CONFIG.backupDir, { recursive: true });
    cpSync(CONFIG.scriptsDir, backupPath, { recursive: true });
    log('INFO', `备份完成: ${backupPath}`);
    
    // 清理旧备份
    cleanupOldBackups();
    
    lastBackupTime = Date.now();
    return true;
  } catch (e) {
    log('ERROR', `备份失败: ${e.message}`);
    return false;
  }
}

// 清理旧备份
function cleanupOldBackups() {
  try {
    const dirs = readdirSync(CONFIG.backupDir)
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        time: statSync(join(CONFIG.backupDir, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    for (let i = CONFIG.maxBackups; i < dirs.length; i++) {
      rmSync(join(CONFIG.backupDir, dirs[i].name), { recursive: true });
      log('INFO', `删除旧备份: ${dirs[i].name}`);
    }
  } catch (e) {
    // 忽略
  }
}

// 回滚
function rollback(backupName) {
  log('WARN', `开始回滚到: ${backupName}`);
  
  const backupPath = join(CONFIG.backupDir, backupName);
  if (!existsSync(backupPath)) {
    log('ERROR', `备份不存在: ${backupName}`);
    return false;
  }
  
  try {
    // 备份当前
    backup();
    
    // 恢复
    rmSync(CONFIG.scriptsDir, { recursive: true });
    cpSync(backupPath, CONFIG.scriptsDir, { recursive: true });
    
    log('INFO', '回滚完成');
    return true;
  } catch (e) {
    log('ERROR', `回滚失败: ${e.message}`);
    return false;
  }
}

// 检查OpenClaw
function checkOpenClaw() {
  try {
    const output = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${CONFIG.openclawPort}/health`, {
      timeout: 5000
    });
    return output.toString().trim() === '200';
  } catch (e) {
    return false;
  }
}

// 检查记忆脚本
function checkMemoryScripts() {
  const required = [
    'importance-filter.js',
    'smart-search.js',
    'smart-storage.js'
  ];
  
  for (const file of required) {
    if (!existsSync(join(CONFIG.scriptsDir, file))) {
      log('WARN', `缺少文件: ${file}`);
      return false;
    }
  }
  
  return true;
}

// 检查健康
function healthCheck() {
  const checks = {
    openclaw: checkOpenClaw(),
    scripts: checkMemoryScripts(),
    backup: existsSync(CONFIG.backupDir)
  };
  
  return {
    healthy: Object.values(checks).every(v => v),
    checks
  };
}

// 获取可用备份
function listBackups() {
  try {
    return readdirSync(CONFIG.backupDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// 主循环
async function main() {
  log('INFO', '记忆守护进程启动');
  
  // 初始备份
  backup();
  
  setInterval(async () => {
    const health = healthCheck();
    
    if (!health.healthy) {
      failureCount++;
      log('WARN', `健康检查失败 (${failureCount}/${CONFIG.maxFailures}): ${JSON.stringify(health.checks)}`);
      
      if (failureCount >= CONFIG.maxFailures) {
        // 自动回滚
        const backups = listBackups();
        if (backups.length > 0) {
          log('ERROR', '连续失败,执行自动回滚');
          rollback(backups[0]);
        }
        failureCount = 0;
      }
    } else {
      failureCount = 0;
    }
    
    // 定期备份 (每小时)
    if (Date.now() - lastBackupTime > 3600000) {
      backup();
    }
  }, CONFIG.checkInterval);
  
  // 优雅退出
  process.on('SIGTERM', () => {
    log('INFO', '收到退出信号,退出');
    process.exit(0);
  });
}

main();
