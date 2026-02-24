#!/bin/bash
# Token 用量监控脚本

PROXY="${HTTP_PROXY:-http://127.0.0.1:7897}"
LOG_FILE="$HOME/.openclaw/workspace/memory/token-usage.json"

# 尝试从环境变量或配置文件获取
API_KEY="${VECTORENGINE_API_KEY:-}"

if [ -z "$API_KEY" ]; then
    # 尝试从 credential 文件读取
    API_KEY=$(cat ~/.openclaw/credentials 2>/dev/null | grep vectorengine | cut -d= -f2)
fi

if [ -z "$API_KEY" ]; then
    echo "⚠️ 无法读取 API Key，跳过 Token 检查"
    exit 0
fi

# 获取用量
USAGE=$(curl -sS --proxy "$PROXY" \
  "https://api.vectorengine.ai/v1/dashboard/billing/usage" \
  -H "Authorization: Bearer $API_KEY" 2>/dev/null)

TOTAL=$(echo "$USAGE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_usage',0))" 2>/dev/null)

if [ -z "$TOTAL" ] || [ "$TOTAL" = "0" ]; then
    echo "⚠️ Token 检查失败"
    exit 0
fi

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

python3 << PYEOF
import json
log_path = "$LOG_FILE"
try:
    with open(log_path) as f:
        data = json.load(f)
except:
    data = {"history": [], "latest": 0}

data["history"].append({"date": "$DATE", "time": "$TIME", "total": $TOTAL})
data["history"] = data["history"][-30:]
data["latest"] = $TOTAL

with open(log_path, "w") as f:
    json.dump(data, f, indent=2)
PYEOF

echo "Token usage: \$$TOTAL"
