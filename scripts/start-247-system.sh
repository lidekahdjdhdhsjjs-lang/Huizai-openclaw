#!/bin/bash

# OpenClaw 24/7 持续学习系统启动脚本
# 位置: ~/.openclaw/workspace/scripts/start-247-system.sh

LOG_DIR="$HOME/.openclaw/foundry/logs"
mkdir -p "$LOG_DIR"

echo "[$(date)] 启动 OpenClaw 24/7 持续学习系统..."

# 1. 启动持续学习器
echo "[$(date)] 启动持续学习器..."
cd ~/.openclaw/extensions/learning
node -e "
const ContinuousLearner = require('./continuous-learner');
const learner = new ContinuousLearner({ proxy: 'http://127.0.0.1:7897' });
console.log('ContinuousLearner 初始化完成');
console.log('可用适配器:', Object.keys(learner.adapters));
" >> "$LOG_DIR/learner-startup.log" 2>&1 &

# 2. 启动进化引擎
echo "[$(date)] 启动进化引擎..."
cd ~/.openclaw/extensions/evolution/engine
node -e "
const ContinuousEvolver = require('./continuous-evolver');
const evolver = new ContinuousEvolver({ aggressiveMode: true });
console.log('ContinuousEvolver 初始化完成');
console.log('激进模式:', evolver.config.aggressiveMode);
" >> "$LOG_DIR/evolution-startup.log" 2>&1 &

# 3. 启动调度器
echo "[$(date)] 启动24小时调度器..."
cd ~/.openclaw/extensions/scheduler
node hourly-scheduler.js >> "$LOG_DIR/scheduler.log" 2>&1 &
SCHEDULER_PID=$!
echo $SCHEDULER_PID > ~/.openclaw/workspace/scripts/pids/scheduler.pid

# 4. 启动自动化系统
echo "[$(date)] 启动自动化系统..."
cd ~/.openclaw/extensions/automation

# 启动 Cron 管理器
node -e "
const CronManager = require('./cron-manager');
const cron = new CronManager();
cron.startDaemon();
console.log('CronManager 守护进程已启动');
" >> "$LOG_DIR/automation-startup.log" 2>&1 &

# 5. 启动激进模式
echo "[$(date)] 启动激进进化模式..."
cd ~/.openclaw/extensions/evolution/aggressive

# Hook 生成器
node -e "
const HookGenerator = require('./hook-generator');
const hookGen = new HookGenerator();
console.log('HookGenerator 初始化完成');
" >> "$LOG_DIR/aggressive-startup.log" 2>&1 &

# 技能工厂
node -e "
const SkillFactory = require('./skill-factory');
const skillFact = new SkillFactory();
console.log('SkillFactory 初始化完成');
" >> "$LOG_DIR/aggressive-startup.log" 2>&1 &

# 6. 执行一次完整学习周期
echo "[$(date)] 执行初始学习周期..."
cd ~/.openclaw/extensions/learning
timeout 120 node -e "
const ContinuousLearner = require('./continuous-learner');
const learner = new ContinuousLearner({ proxy: 'http://127.0.0.1:7897' });

async function initialLearning() {
  console.log('开始初始学习...');
  try {
    const result = await learner.learnCycle(['github', 'practice']);
    console.log('学习完成:', result);
    process.exit(0);
  } catch (e) {
    console.error('学习错误:', e.message);
    process.exit(1);
  }
}

initialLearning();
" >> "$LOG_DIR/initial-learning.log" 2>&1

echo "[$(date)] OpenClaw 24/7 系统启动完成！"
echo "查看日志: tail -f $LOG_DIR/*.log"
