#!/bin/bash
# 收入追踪脚本 - 记录 ClawHub 技能销售和潜在收入
# 每天运行一次

LOG_FILE="$HOME/.openclaw/workspace/memory/revenue.json"
CLAWHUB_USER="lidekahdjdhdhsjjs-lang"

python3 << 'PYEOF'
import json
import os
from datetime import datetime

log_path = "$LOG_FILE"

# 读取或初始化
if os.path.exists(log_path):
    with open(log_path) as f:
        data = json.load(f)
else:
    data = {"last_updated": "", "skills": [], "total_earnings": 0}

# 技能列表（已发布的）
skills = [
    {"name": "hz-context-optimizer", "price": 5, "sales": 0},
    {"name": "hz-error-guard", "price": 3, "sales": 0},
    {"name": "hz-proactive-agent", "price": 5, "sales": 0},
]

data["last_updated"] = datetime.now().isoformat()
data["skills"] = skills
data["total_earnings"] = sum(s["price"] * s["sales"] for s in skills)

# 潜在收入
data["potential_monthly"] = sum(s["price"] * 10 for s in skills)  # 假设每月10个销售

with open(log_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"✅ 收入追踪已更新")
print(f"📊 已发布技能: {len(skills)} 个")
print(f"💰 预计月收入: ${data['potential_monthly']}")
PYEOF
