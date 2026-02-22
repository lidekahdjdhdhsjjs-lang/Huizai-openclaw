#!/bin/bash
# Safe Gateway Restart - 安全重启 OpenClaw Gateway
# 支持 Telegram 通知

REASON="${1:-manual}"
NOTIFY="${SAFE_RESTART_TELEGRAM_TARGET:-}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
CONFIG="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"

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
    STATUS="SUCCESS"
else
    echo "❌ Gateway failed to start"
    STATUS="FAILED"
fi

# Telegram 通知
if [ -n "$NOTIFY" ] && command -v curl &> /dev/null; then
    curl -sS -X POST "https://api.telegram.org/bot$NOTIFY/sendMessage" \
        -d "chat_id=$NOTIFY" \
        -d "text=🔄 OpenClaw Gateway Restart: $REASON - $STATUS"
fi
