#!/usr/bin/env node
/**
 * Cron优化器 - Cron Optimizer
 * 分析、合并、优化cron任务
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const CRON_FILE = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');

// 分析结果
const analysis = {
  redundant: [],
  mergable: [],
  keep: [],
  add: []
};

// 加载现有任务
const jobs = JSON.parse(fs.readFileSync(CRON_FILE, 'utf8'));

console.log('=== Cron任务分析 ===\n');
console.log(`总任务数: ${jobs.jobs.length}`);
console.log(`已启用: ${jobs.jobs.filter(j => j.enabled).length}`);
console.log(`已禁用: ${jobs.jobs.filter(j => !j.enabled).length}`);

// 分析每个任务
jobs.jobs.forEach(job => {
  // 禁用的任务
  if (!job.enabled) {
    analysis.redundant.push({
      id: job.id,
      name: job.name,
      reason: '已禁用'
    });
    return;
  }

  // 功能重叠的任务
  if (job.name.includes('learning') || job.name.includes('learn')) {
    if (job.name !== 'foundry-crossbot-learning') {
      analysis.mergable.push({
        id: job.id,
        name: job.name,
        canMergeWith: 'foundry-crossbot-learning',
        reason: '学习类任务可合并'
      });
    }
  }

  // 保留的核心任务
  const coreTasks = [
    'daily-memory-summary',      // 每日总结
    'foundry-evolution-v2',      // 进化循环
    'foundry-crossbot-learning', // 跨Bot学习
    'company-weekly-review',     // 周报
    'auto-proactive-check',      // 主动检查
    'smart-diagnosis',           // 智能诊断
    'evening-report',            // 晚间汇报
    'weekly-deep-review',        // 深度复盘
    'arxiv-learning',            // 学术学习
    'memory-janitor',            // 记忆清理
    'bot-discord-discussion'     // Discord讨论
  ];

  if (coreTasks.includes(job.name)) {
    analysis.keep.push({
      id: job.id,
      name: job.name,
      schedule: job.schedule?.expr || job.schedule?.everyMs + 'ms'
    });
  }
});

// 建议添加的任务
analysis.add = [
  {
    name: 'evolution-cycle',
    schedule: '0 */4 * * *',
    description: '完整进化循环（感知→学习→进化→验证）',
    script: 'evolution-cycle.sh'
  },
  {
    name: 'heartbeat-monitor',
    schedule: '*/5 * * * *',
    description: '心跳监控，检测系统健康',
    script: 'heartbeat-monitor.sh'
  },
  {
    name: 'memory-index-update',
    schedule: '0 3 * * *',
    description: '记忆索引更新和清理',
    script: 'memory-index-maintenance.sh'
  }
];

// 输出分析结果
console.log('\n--- 建议删除 ---');
analysis.redundant.forEach(j => 
  console.log(`  - ${j.name}: ${j.reason}`)
);

console.log('\n--- 建议合并 ---');
analysis.mergable.forEach(j =>
  console.log(`  - ${j.name} → ${j.canMergeWith}: ${j.reason}`)
);

console.log('\n--- 保留任务 ---');
analysis.keep.forEach(j =>
  console.log(`  ✓ ${j.name} (${j.schedule})`)
);

console.log('\n--- 建议添加 ---');
analysis.add.forEach(j =>
  console.log(`  + ${j.name} (${j.schedule}): ${j.description}`)
);

// 生成优化后的jobs.json
const optimizedJobs = {
  version: 1,
  jobs: jobs.jobs.filter(j => 
    analysis.keep.some(k => k.id === j.id) || 
    analysis.mergable.some(m => m.name === 'foundry-crossbot-learning' && m.id === j.id)
  )
};

// 添加新任务
const now = Date.now();
analysis.add.forEach((task, i) => {
  optimizedJobs.jobs.push({
    id: `new-${now}-${i}`,
    agentId: 'main',
    name: task.name,
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: 'cron',
      expr: task.schedule
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: `运行 ~/.openclaw/workspace/scripts/${task.script}`
    },
    delivery: {
      mode: 'none'
    },
    state: {}
  });
});

// 保存优化后的配置
const backupPath = CRON_FILE + '.before-optimization';
fs.writeFileSync(backupPath, JSON.stringify(jobs, null, 2));
console.log(`\n备份保存: ${backupPath}`);

fs.writeFileSync(CRON_FILE, JSON.stringify(optimizedJobs, null, 2));
console.log(`优化后任务数: ${optimizedJobs.jobs.length}`);

console.log('\n优化完成！原任务数: ' + jobs.jobs.length + ' → 新任务数: ' + optimizedJobs.jobs.length);
