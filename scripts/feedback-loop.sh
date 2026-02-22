#!/bin/bash
# 反馈闭环脚本 - 记录行动→结果→学习→改进
# 每次重要行动后运行

ACTION="$1"
RESULT="$2"
DETAILS="${3:-}"

LOG_FILE="$HOME/.openclaw/workspace/memory/feedback-loop.json"

python3 << PYEOF
import json
import os
from datetime import datetime

log_path = "$LOG_FILE"

# 初始化
if os.path.exists(log_path):
    with open(log_path) as f:
        data = json.load(f)
else:
    data = {"actions": [], "insights": [], "improvements": []}

# 记录行动
action_entry = {
    "timestamp": datetime.now().isoformat(),
    "action": "$ACTION",
    "result": "$RESULT",
    "details": "$DETAILS"
}

data["actions"].append(action_entry)
data["actions"] = data["actions"][-100:]  # 保留最近100条

# 分析结果，生成洞察
if "$RESULT" == "success":
    insight = f"行动 '$ACTION' 成功，可继续优化"
    data["insights"].append({
        "timestamp": datetime.now().isoformat(),
        "type": "success",
        "content": insight
    })
elif "$RESULT" == "failed":
    insight = f"行动 '$ACTION' 失败，需分析原因"
    data["insights"].append({
        "timestamp": datetime.now().isoformat(),
        "type": "failure", 
        "content": insight
    })
    # 自动生成改进建议
    data["improvements"].append({
        "timestamp": datetime.now().isoformat(),
        "action": "$ACTION",
        "suggestion": "检查失败原因，更新策略"
    })

# 保留最近洞察
data["insights"] = data["insights"][-50:]
data["improvements"] = data["improvements"][-20:]

# 保存
with open(log_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"✅ 反馈已记录: $ACTION → $RESULT")
if "$DETAILS":
    print(f"   详情: $DETAILS")
PYEOF
