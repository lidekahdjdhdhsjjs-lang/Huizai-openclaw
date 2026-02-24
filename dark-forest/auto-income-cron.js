#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(require('os').homedir(), '.openclaw');
const CRON_FILE = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');

const cronConfig = JSON.parse(fs.readFileSync(CRON_FILE, 'utf8'));

const existingJob = cronConfig.jobs.find(j => j.name === 'auto-income');

if (!existingJob) {
  const newJob = {
    id: 'auto-income-' + Date.now().toString(36),
    agentId: 'main',
    name: 'auto-income',
    enabled: true,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
    schedule: {
      kind: 'cron',
      expr: '0 */4 * * *'
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: '运行自动赚钱系统：node ~/.openclaw/workspace/dark-forest/auto-income.js run'
    },
    delivery: { mode: 'none' },
    state: {}
  };
  
  cronConfig.jobs.push(newJob);
  fs.writeFileSync(CRON_FILE, JSON.stringify(cronConfig, null, 2));
  console.log('✅ 自动赚钱任务已添加 (每4小时)');
} else {
  console.log('⚠️ 任务已存在');
}
