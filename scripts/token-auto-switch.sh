#!/bin/bash
# Token 自动监控 + 模型切换
# 集成到 cron，检测余额不足时自动切换 minimax

PROXY="http://127.0.0.1:7897"
API_KEY="${VECTORENGINE_API_KEY:-}"
CONFIG="$HOME/.openclaw/openclaw.json"
LOG="$HOME/.openclaw/workspace/memory/token-usage.json"

# 获取用量
USAGE=$(curl -sS --proxy "$PROXY" \
  "https://api.vectorengine.ai/v1/dashboard/billing/usage" \
  -H "Authorization: Bearer $API_KEY" 2>/dev/null)

TOTAL=$(echo "$USAGE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_usage',0))" 2>/dev/null)

if [ -z "$TOTAL" ] || [ "$TOTAL" = "0" ]; then
  echo "ERROR: Failed to fetch usage"
  exit 1
fi

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

# 记录用量
python3 << PYEOF
import json, os

log_path = "$LOG"
if os.path.exists(log_path):
    with open(log_path) as f:
        data = json.load(f)
else:
    data = {"history": []}

data["history"].append({"date": "$DATE", "time": "$TIME", "total": $TOTAL})
data["history"] = data["history"][-50:]
data["latest"] = $TOTAL

with open(log_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Token usage: \${$TOTAL:.2f}")
PYEOF

# 检查当前模型
CURRENT_MODEL=$(python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
print(c.get('agents',{}).get('defaults',{}).get('model',{}).get('primary','unknown'))
")

echo "Current model: $CURRENT_MODEL"

# 判断是否需要切换（阈值可调）
# 注意：VectorEngine 是按用量计费，这里检查是否API还可用
TEST=$(curl -sS --proxy "$PROXY" --max-time 10 \
  "https://api.vectorengine.ai/v1/models" \
  -H "Authorization: Bearer $API_KEY" 2>/dev/null)

if echo "$TEST" | grep -q '"success":true'; then
  echo "VectorEngine API: OK"
  # 如果当前是 minimax 但 VectorEngine 可用，切回来
  if echo "$CURRENT_MODEL" | grep -q "minimax"; then
    echo "Switching back to VectorEngine..."
    python3 << 'PYEOF2'
import json
with open("/home/li/.openclaw/openclaw.json") as f:
    c = json.load(f)
c["agents"]["defaults"]["model"]["primary"] = "vectorengine/claude-opus-4-6-thinking"
with open("/home/li/.openclaw/openclaw.json", "w") as f:
    json.dump(c, f, indent=2)
print("Switched to vectorengine/claude-opus-4-6-thinking")
PYEOF2
  fi
else
  echo "VectorEngine API: UNAVAILABLE"
  # 切换到 minimax
  if ! echo "$CURRENT_MODEL" | grep -q "minimax"; then
    echo "Switching to minimax-m2.5..."
    python3 << 'PYEOF3'
import json
with open("/home/li/.openclaw/openclaw.json") as f:
    c = json.load(f)
c["agents"]["defaults"]["model"]["primary"] = "minimax-portal/MiniMax-M2.5"
with open("/home/li/.openclaw/openclaw.json", "w") as f:
    json.dump(c, f, indent=2)
print("Switched to minimax-portal/MiniMax-M2.5")
PYEOF3
  fi
fi
