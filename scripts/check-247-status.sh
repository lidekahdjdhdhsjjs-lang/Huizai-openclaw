#!/bin/bash
echo "========================================="
echo "  OpenClaw 24/7 系统状态检查"
echo "========================================="
echo ""

echo "📊 核心进程状态:"
echo "  Memory Guardian: $(ps aux | grep 'memory-guardian' | grep -v grep | awk '{print $2" 运行中"}' || echo '未运行')"
echo "  Memory Evolver:  $(ps aux | grep 'memory-evolver' | grep -v grep | awk '{print $2" 运行中"}' || echo '未运行')"
echo "  OpenClaw Gateway: $(ps aux | grep 'openclaw-gateway' | grep -v grep | awk '{print $2" 运行中"}' || echo '未运行')"
echo ""

echo "🧠 学习适配器:"
cd ~/.openclaw/extensions/learning 2>/dev/null && node -e "
const { ContinuousLearner } = require('./continuous-learner');
const l = new ContinuousLearner({ proxy: 'http://127.0.0.1:7897' });
console.log('  适配器: ' + Object.keys(l.adapters).join(', '));
console.log('  状态: ' + (l.isLearning ? '学习中' : '空闲'));
" 2>/dev/null
echo ""

echo "⚡ 进化引擎:"
cd ~/.openclaw/extensions/evolution/engine 2>/dev/null && node -e "
const { ContinuousEvolver } = require('./continuous-evolver');
const e = new ContinuousEvolver({ aggressiveMode: true });
console.log('  激进模式: ' + e.config.aggressiveMode);
console.log('  代数: ' + e.generation);
" 2>/dev/null
echo ""

echo "📅 Cron 调度:"
cd ~/.openclaw/extensions/automation 2>/dev/null && node -e "
const CronManager = require('./cron-manager');
const c = new CronManager();
const s = c.getStatus();
console.log('  当前任务: ' + (s.currentTask || 'none'));
console.log('  下次任务: ' + (s.nextTask ? s.nextTask.name + ' (' + s.nextTask.in + ')' : 'none'));
console.log('  调度数: ' + s.totalSchedules);
" 2>/dev/null
echo ""

echo "🪝 Hook 生成器:"
cd ~/.openclaw/extensions/evolution/aggressive 2>/dev/null && node -e "
const HookGenerator = require('./hook-generator');
const h = new HookGenerator();
console.log('  状态: 已就绪');
" 2>/dev/null
echo ""

echo "🎯 技能工厂:"
cd ~/.openclaw/extensions/evolution/aggressive 2>/dev/null && node -e "
const SkillFactory = require('./skill-factory');
const s = new SkillFactory();
console.log('  状态: 已就绪');
" 2>/dev/null
echo ""

echo "========================================="
echo "  工具 Fitness 排名"
echo "========================================="
cat ~/.openclaw/foundry/metrics.json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
tools = [(k, v.get('fitness', 0)*100) for k, v in data.items()]
tools.sort(key=lambda x: x[1], reverse=True)
for t, f in tools[:5]:
    print(f'  {t}: {f:.1f}%')
" 2>/dev/null

echo ""
echo "✅ 系统检查完成"
