#!/bin/bash
# Safe Gateway Restart - 安全重启 OpenClaw Gateway
# 使用 Discord Webhook 通知

REASON="${1:-manual}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

echo "[$(date)] Safe restart triggered: $REASON"

# 记录当前状态
echo "Recording current state..."

# 优雅停止
echo "Stopping gateway..."
systemctl --user stop openclaw-gateway 2>/dev/null || pkill -f "openclaw.*gateway" 2>/dev/null
sleep 2

# 验证停止
if pgrep -f "openclaw.*gateway" > /dev/null; then
    echo "Warning: Gateway still running, force killing..."
    pkill -9 -f "openclaw.*gateway" 2>/dev/null
    sleep 1
fi

# 启动
echo "Starting gateway..."
systemctl --user start openclaw-gateway 2>/dev/null || $OPENCLAW_BIN gateway start 2>/dev/null
sleep 3

# 验证
if systemctl --user is-active --quiet openclaw-gateway; then
    echo "✅ Gateway started successfully"
    STATUS="✅ 成功"
    COLOR="65280"
else
    echo "❌ Gateway failed to start"
    STATUS="❌ 失败"
    COLOR="16711680"
fi

# Discord 通知
if [ -n "$DISCORD_WEBHOOK" ] && command -v curl &> /dev/null; then
    curl -sS -X POST "$DISCORD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"embeds\": [{
                \"title\": \"🔄 OpenClaw Gateway 重启\",
                \"description\": \"原因: $REASON\\n状态: $STATUS\",
                \"color\": \"$COLOR\",
                \"timestamp\": \"$(date -Iseconds)\"
            }]
        }"
fi
