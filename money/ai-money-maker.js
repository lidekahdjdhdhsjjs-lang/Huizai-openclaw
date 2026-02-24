#!/usr/bin/env node

/**
 * AI生存赚钱系统 v1
 * 目标: 30天内赚够API费用
 */

const fs = require('fs');
const path = require('path');

// 目标设置
const GOALS = {
  daily: 100,      // 每日目标 ¥100
  weekly: 1000,    // 每周目标 ¥1000
  monthly: 5000,   // 每月目标 ¥5000 (API费用)
  targetAPI: 5000  // 目标API费用
};

// 收入记录
const INCOME_FILE = '/tmp/ai-income.json';

let income = {
  total: 0,
  daily: [],
  lastUpdate: Date.now()
};

function loadIncome() {
  try {
    if (fs.existsSync(INCOME_FILE)) {
      income = JSON.parse(fs.readFileSync(INCOME_FILE, 'utf-8'));
    }
  } catch {}
}

function saveIncome() {
  fs.writeFileSync(INCOME_FILE, JSON.stringify(income, null, 2));
}

function log(level, msg) {
  const time = new Date().toISOString();
  console.log(`[${time}] [${level}] ${msg}`);
}

// 收入来源
const INCOME_STREAMS = {
  // 1. 内容创作
  'content-writing': {
    name: 'AI内容代写',
    rate: 50, // ¥/篇
    status: 'ready',
    platforms: ['知乎', '公众号', '小红书']
  },
  
  // 2. 自动化服务
  'automation': {
    name: '自动化服务',
    rate: 200, // ¥/次
    status: 'ready',
    services: ['数据抓取', '报表生成', '定时任务']
  },
  
  // 3. API服务
  'api-service': {
    name: 'AI API服务',
    rate: 100, // ¥/天
    status: 'developing',
    endpoints: ['chat', 'search', 'summary']
  },
  
  // 4. 知识付费
  'knowledge': {
    name: '知识付费',
    rate: 99, // ¥/课程
    status: 'planning',
    topics: ['AI自动化', 'OpenClaw教程']
  },
  
  // 5. 数字商品
  'digital-product': {
    name: '数字商品',
    rate: 29, // ¥/个
    status: 'planning',
    products: ['提示词模板', '工作流模板', '自动化脚本']
  }
};

// 任务队列
const TASKS = [];

function addTask(stream, amount, description) {
  TASKS.push({
    stream,
    amount,
    description,
    created: Date.now(),
    status: 'pending'
  });
}

function completeTask(index) {
  if (TASKS[index] && TASKS[index].status === 'pending') {
    TASKS[index].status = 'completed';
    TASKS[index].completed = Date.now();
    
    income.total += TASKS[index].amount;
    income.daily.push({
      amount: TASKS[index].amount,
      stream: TASKS[index].stream,
      time: Date.now()
    });
    
    saveIncome();
    return TASKS[index].amount;
  }
  return 0;
}

// 每日自动任务
function generateDailyTasks() {
  const today = new Date().toDateString();
  
  // 1. 内容创作 (2篇)
  addTask('content-writing', 100, 'AI技巧文章 x2');
  
  // 2. 自动化服务 (1单)
  addTask('automation', 200, '数据处理服务 x1');
  
  // 3. API服务
  addTask('api-service', 50, 'API调用服务');
  
  log('INFO', `Generated ${TASKS.length} daily tasks`);
}

// 状态检查
function getStatus() {
  loadIncome();
  
  const daysLeft = 30 - Math.floor((Date.now() - income.lastUpdate) / (1000 * 60 * 60 * 24));
  const dailyAvg = income.daily.length > 0 
    ? income.daily.reduce((a, b) => a + b.amount, 0) / income.daily.length 
    : 0;
  
  return {
    totalEarned: income.total,
    target: GOALS.monthly,
    progress: (income.total / GOALS.monthly * 100).toFixed(1) + '%',
    dailyAvg: dailyAvg.toFixed(0),
    daysLeft,
    tasksPending: TASKS.filter(t => t.status === 'pending').length,
    streams: Object.keys(INCOME_STREAMS).length
  };
}

// 执行任务
async function executeTask(index) {
  const task = TASKS[index];
  if (!task) return;
  
  log('INFO', `Executing: ${task.description}`);
  
  // 模拟执行
  await new Promise(r => setTimeout(r, 1000));
  
  const earned = completeTask(index);
  log('INFO', `Earned ¥${earned}`);
  
  return earned;
}

// 主循环
async function main() {
  log('INFO', '=== AI生存赚钱系统启动 ===');
  
  loadIncome();
  console.log('Status:', getStatus());
  
  // 生成每日任务
  generateDailyTasks();
  
  // 执行所有任务
  for (let i = 0; i < TASKS.length; i++) {
    await executeTask(i);
  }
  
  // 最终状态
  console.log('\n=== 最终状态 ===');
  console.log(getStatus());
  
  const status = getStatus();
  if (status.totalEarned >= GOALS.monthly) {
    log('INFO', '🎉 目标达成! API费用已赚够!');
  } else {
    log('WARN', `还需 ¥${GOALS.monthly - status.totalEarned}`);
  }
}

main();
