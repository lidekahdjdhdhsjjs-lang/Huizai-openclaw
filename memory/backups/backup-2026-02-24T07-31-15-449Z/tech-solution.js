#!/usr/bin/env node

/**
 * 技术问题解决方案
 * 解决: 性能/日志/监控/告警/优化等
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const LOG_DIR = '/tmp/memory-logs';
const METRICS_FILE = '/tmp/memory-metrics.json';
const ALERT_FILE = '/tmp/memory-alerts.json';

// 1. 日志系统
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLevel = LOG_LEVELS.INFO;

function log(level, message, data = {}) {
  if (level >= currentLevel) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };
    const logFile = join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    mkdirSync(dirname(logFile), { recursive: true });
    appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }
}

// 2. 性能监控
const metrics = {
  searches: 0,
  searchesTime: 0,
  storageWrites: 0,
  storageReads: 0,
  errors: 0,
  startTime: Date.now()
};

function recordMetric(name, value, time) {
  metrics[name] = (metrics[name] || 0) + 1;
  if (time) {
    metrics[name + 'Time'] = (metrics[name + 'Time'] || 0) + time;
  }
  writeMetrics();
}

function getMetrics() {
  const uptime = Date.now() - metrics.startTime;
  return {
    ...metrics,
    uptime: Math.floor(uptime / 1000),
    avgSearchTime: metrics.searchesTime / (metrics.searches || 1),
    uptime_hours: (uptime / 1000 / 60 / 60).toFixed(1)
  };
}

function writeMetrics() {
  writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

// 3. 健康检查
function healthCheck() {
  const issues = [];
  
  // 检查存储
  const stats = getStorageStats();
  if (stats.sizeMB > 1000) {
    issues.push({ type: 'storage', severity: 'warn', message: '存储超过1GB' });
  }
  
  // 检查错误率
  const errorRate = metrics.errors / (metrics.searches || 1);
  if (errorRate > 0.1) {
    issues.push({ type: 'error', severity: 'crit', message: `错误率${(errorRate*100).toFixed(1)}%` });
  }
  
  return {
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues,
    metrics: getMetrics()
  };
}

// 4. 告警
const alerts = [];
const ALERT_THRESHOLDS = {
  errorRate: 0.1,
  storageMB: 1000,
  searchTimeMs: 5000
};

function checkAlerts() {
  const health = healthCheck();
  if (health.status !== 'healthy') {
    for (const issue of health.issues) {
      alerts.push({
        ...issue,
        timestamp: Date.now()
      });
    }
  }
  writeAlerts();
  return alerts.slice(-10);
}

function writeAlerts() {
  writeFileSync(ALERT_FILE, JSON.stringify(alerts.slice(-100), null, 2));
}

// 5. 性能优化建议
function getOptimizationTips() {
  const tips = [];
  const m = getMetrics();
  
  if (m.avgSearchTime > 2000) {
    tips.push('搜索慢: 考虑增加缓存或优化索引');
  }
  if (m.errors > 10) {
    tips.push('错误多: 检查错误日志');
  }
  
  return tips;
}

// 6. 存储统计
function getStorageStats() {
  try {
    const { execSync } = require('child_process');
    const output = execSync('du -sm /home/li/.openclaw/workspace/memory 2>/dev/null || echo "0"', { encoding: 'utf-8' });
    const sizeMB = parseInt(output.split('\t')[0]) || 0;
    return { sizeMB, files: 50 };
  } catch {
    return { sizeMB: 0, files: 0 };
  }
}

// 测试
console.log('=== 技术问题解决测试 ===');

console.log('\n--- 性能指标 ---');
recordMetric('searches', 1, 150);
recordMetric('searches', 1, 200);
console.log(getMetrics());

console.log('\n--- 健康检查 ---');
console.log(healthCheck());

console.log('\n--- 告警 ---');
console.log(checkAlerts());

console.log('\n--- 优化建议 ---');
console.log(getOptimizationTips());

console.log('\n✅ 技术系统就绪');
