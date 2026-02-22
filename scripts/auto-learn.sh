#!/bin/bash
# 自动学习脚本 - 从行动结果中自动学习
# 整合到 cron，每2小时运行

LOG_FILE="$HOME/.openclaw/workspace/memory/feedback-loop.json"
LEARN_LOG="$HOME/.openclaw/workspace/memory/auto-learn.md"

# 读取反馈数据
python3 << 'PYEOF'
import json
import os
from datetime import datetime, timedelta

log_path = os.path.expanduser("$LOG_FILE")

if not os.path.exists(log_path):
    print("No feedback data yet")
    exit(0)

with open(log_path) as f:
    data = json.load(f)

# 分析最近24小时的行动
recent_actions = []
cutoff = (datetime.now() - timedelta(hours=24)).isoformat()

for action in data.get("actions", []):
    if action.get("timestamp", "") > cutoff:
        recent_actions.append(action)

# 统计
success_count = sum(1 for a in recent_actions if a.get("result") == "success")
fail_count = sum(1 for a in recent_actions if a.get("result") == "failed")

print(f"=== 自动学习报告 ({datetime.now().strftime('%Y-%m-%d %H:%M')}) ===")
print(f"最近24小时行动: {len(recent_actions)}")
print(f"成功: {success_count} | 失败: {fail_count}")

# 生成学习要点
learnings = []

if success_count > 0:
    learnings.append(f"✅ 成功模式: {success_count}个行动成功")

if fail_count > 0:
    learnings.append(f"❌ 失败模式: {fail_count}个行动失败，需要改进")

# 检查改进建议
improvements = data.get("improvements", [])
if improvements:
    print("\n📝 待处理改进建议:")
    for imp in improvements[-5:]:
        print(f"  - {imp.get('action')}: {imp.get('suggestion')}")

# 生成自动学习报告
report = f"""# 自动学习报告 - {datetime.now().strftime('%Y-%m-%d %H:%M')}

## 行动统计 (24小时)
- 总行动: {len(recent_actions)}
- 成功: {success_count}
- 失败: {fail_count}

## 最近成功行动
"""

for a in recent_actions:
    if a.get("result") == "success":
        report += f"- {a.get('action')}: {a.get('details', '')}\n"

if learnings:
    report += "\n## 学习要点\n"
    for l in learnings:
        report += f"- {l}\n"

# 保存报告
report_path = os.path.expanduser("$LEARN_LOG")
with open(report_path, "a") as f:
    f.write(report + "\n---\n")

print(f"\n✅ 学习报告已更新: {report_path}")
PYEOF
