#!/usr/bin/env node

const path = require('path');
const extensionsPath = path.join(process.env.HOME, '.openclaw', 'extensions');

const ContinuousLearner = require(path.join(extensionsPath, 'learning/continuous-learner'));
const ContinuousEvolver = require(path.join(extensionsPath, 'evolution/engine/continuous-evolver'));
const CronManager = require(path.join(extensionsPath, 'automation/cron-manager'));

console.log('=========================================');
console.log('  OpenClaw 24/7 持续学习系统');
console.log('=========================================');
console.log('');

async function main() {
  // 1. 初始化学习器
  console.log('🧠 初始化学习系统...');
  const learner = new ContinuousLearner({ 
    proxy: 'http://127.0.0.1:7897' 
  });
  console.log('  ✅ 学习器就绪');
  console.log('  📡 适配器:', Object.keys(learner.adapters).join(', '));
  console.log('');

  // 2. 初始化进化引擎
  console.log('⚡ 初始化进化引擎...');
  const evolver = new ContinuousEvolver({ 
    aggressiveMode: true,
    openclawPath: process.env.HOME + '/.openclaw'
  });
  console.log('  ✅ 进化引擎就绪');
  console.log('  🎯 激进模式:', evolver.config.aggressiveMode);
  console.log('');

  // 3. 初始化Cron调度
  console.log('📅 初始化调度系统...');
  const cron = new CronManager();
  const status = cron.getStatus();
  console.log('  ✅ 调度器就绪');
  console.log('  ⏰ 当前任务:', status.currentTask || 'none');
  console.log('  📆 下次任务:', status.nextTask ? `${status.nextTask.name} (${status.nextTask.in})` : 'none');
  console.log('');

  // 4. 执行学习周期
  console.log('📚 执行学习周期...');
  try {
    const learnResult = await learner.learnCycle(['practice']);
    console.log('  ✅ 学习完成');
    console.log('  📊 结晶模式:', learnResult.crystallizedCount);
  } catch (e) {
    console.log('  ⚠️ 学习部分完成:', e.message);
  }
  console.log('');

  // 5. 执行进化周期
  console.log('🧬 执行进化周期...');
  try {
    const evoResult = await evolver.evolve();
    console.log('  ✅ 进化完成');
    console.log('  📈 代数:', evoResult.generation);
    console.log('  🎯 部署改进:', evoResult.improvementsDeployed);
  } catch (e) {
    console.log('  ⚠️ 进化部分完成:', e.message);
  }
  console.log('');

  // 6. 启动守护进程
  console.log('🟢 启动守护进程...');
  cron.startDaemon();
  console.log('  ✅ 调度守护进程已启动');
  console.log('');

  console.log('=========================================');
  console.log('  ✅ OpenClaw 24/7 系统启动完成!');
  console.log('=========================================');
  console.log('');
  console.log('查看状态: ~/.openclaw/workspace/scripts/check-247-status.sh');
  console.log('查看日志: tail -f ~/.openclaw/foundry/logs/*.log');
}

main().catch(console.error);
