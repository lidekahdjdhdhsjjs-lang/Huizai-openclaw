#!/usr/bin/env node

/**
 * 访问问题解决方案
 * 解决: 主动提醒/预测/学习/同步/推送等
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

// 提醒系统
const REMINDERS_FILE = '/tmp/reminders.json';

// 添加提醒
function addReminder(text, time, type = 'time') {
  const reminders = loadReminders();
  reminders.push({ text, time, type, created: Date.now() });
  writeReminders(reminders);
  return reminders;
}

// 触发提醒
function checkReminders() {
  const reminders = loadReminders();
  const now = Date.now();
  const triggered = [];
  
  for (const r of reminders) {
    if (r.time <= now) {
      triggered.push(r);
    }
  }
  
  return triggered;
}

// 学习用户偏好
function learnPreference(key, value) {
  const prefs = loadPreferences();
  prefs[key] = { value, lastUpdate: Date.now() };
  writePreferences(prefs);
}

// 获取偏好
function getPreference(key) {
  const prefs = loadPreferences();
  return prefs[key];
}

// 主动建议
function suggestBasedOnHistory() {
  const history = loadSearchHistory();
  const suggestions = [];
  
  // 基于搜索历史推荐
  const recent = history.slice(-20).map(h => h.query);
  const counts = {};
  for (const q of recent) {
    counts[q] = (counts[q] || 0) + 1;
  }
  
  // 最常搜索的
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([q]) => q);
  
  return top;
}

// 加载/保存
function loadReminders() {
  try {
    return existsSync(REMINDERS_FILE) ? JSON.parse(readFileSync(REMINDERS_FILE, 'utf-8')) : [];
  } catch { return []; }
}

function writeReminders(r) {
  writeFileSync(REMINDERS_FILE, JSON.stringify(r, null, 2));
}

function loadPreferences() {
  const f = '/tmp/preferences.json';
  try {
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : {};
  } catch { return {}; }
}

function writePreferences(p) {
  writeFileSync('/tmp/preferences.json', JSON.stringify(p, null, 2));
}

function loadSearchHistory() {
  const f = '/tmp/search-history.json';
  try {
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : [];
  } catch { return []; }
}

// 测试
console.log('=== 访问问题解决测试 ===');

console.log('\n--- 偏好学习 ---');
learnPreference('tone', '专业简洁');
learnPreference('language', '中文');
console.log('偏好:', getPreference('tone'));

console.log('\n--- 主动建议 ---');
console.log('建议:', suggestBasedOnHistory());

console.log('\n--- 提醒 ---');
addReminder('检查cron任务', Date.now() + 60000);
console.log('提醒已设置');

console.log('\n✅ 访问系统就绪');
