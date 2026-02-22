#!/bin/bash
# ClawHub 收入检查脚本

echo "=== ClawHub 收入检查 ==="

# 已发布的技能
SKILLS=("hz-context-optimizer" "hz-error-guard" "hz-proactive-agent")

for skill in "${SKILLS[@]}"; do
    echo "检查: $skill"
    # 这里可以调用 ClawHub API 获取销售数据
    # 暂时记录为待确认
    echo "  销售: 待确认"
done

echo ""
echo "💡 访问 https://clawhub.ai/dashboard 查看详细收入"

# 记录
python3 << PYEOF
import json
from datetime import datetime

log = {
    "last_check": datetime.now().isoformat(),
    "earnings": "pending",
    "note": "需要登录ClawHub dashboard查看"
}

with open("$HOME/.openclaw/workspace/memory/clawhub-earnings.json", "w") as f:
    json.dump(log, f, indent=2)

print("✅ 记录已更新")
PYEOF
