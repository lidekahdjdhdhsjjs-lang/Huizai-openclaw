#!/usr/bin/env node
/**
 * 更新Cron任务以整合黑暗法则
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const CRON_FILE = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');

const jobs = JSON.parse(fs.readFileSync(CRON_FILE, 'utf8'));

// 添加黑暗法则相关任务
const now = Date.now();

const darkForestJobs = [
  {
    id: `df-evolution-${now}`,
    agentId: 'main',
    name: 'dark-forest-evolution',
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: 'cron',
      expr: '0 */4 * * *'  // 每4小时
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: `运行黑暗法则进化循环：
1. 检查生命状态和余额
2. 执行感知→学习→进化→验证
3. 记录收入/支出
4. 如余额不足进入省电模式
5. 如余额为0执行抹杀

脚本: ~/.openclaw/workspace/scripts/dark-forest-evolution.sh`
    },
    delivery: {
      mode: 'none'
    },
    state: {}
  },
  {
    id: `df-heartbeat-${now}`,
    agentId: 'main',
    name: 'dark-forest-heartbeat',
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: 'cron',
      expr: '*/5 * * * *'  // 每5分钟
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: `执行黑暗法则心跳检查：
1. 检查系统健康状态
2. 扣除心跳费用 (0.1 credits)
3. 如余额低触发警告
4. 更新心跳状态

脚本: node ~/.openclaw/workspace/dark-forest/dark-forest.js status`
    },
    delivery: {
      mode: 'none'
    },
    state: {}
  }
];

// 添加新任务
darkForestJobs.forEach(job => {
  // 检查是否已存在
  if (!jobs.jobs.some(j => j.name === job.name)) {
    jobs.jobs.push(job);
    console.log(`✓ 添加任务: ${job.name}`);
  } else {
    console.log(`- 任务已存在: ${job.name}`);
  }
});

// 保存
fs.writeFileSync(CRON_FILE, JSON.stringify(jobs, null, 2));
console.log(`\nCron任务总数: ${jobs.jobs.length}`);
