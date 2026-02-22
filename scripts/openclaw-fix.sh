#!/bin/bash
# OpenClaw Auto-Fix - 自动修复 Gateway 故障
# 使用 Discord Webhook 通知

LOG_FILE="$HOME/.openclaw/logs/auto-fix.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "=== Auto-fix triggered ==="

# 检查常见问题
log "Checking common issues..."

# 1. 检查配置语法
if command -v python3 &> /dev/null; then
    python3 -c "import json; json.load(open('$HOME/.openclaw/openclaw.json'))" 2>&1
    if [ $? -eq 0 ]; then
        log "✅ Config JSON valid"
    else
        log "❌ Config JSON invalid - restoring backup"
        cp "$HOME/.openclaw/openclaw.json.bak" "$HOME/.openclaw/openclaw.json" 2>/dev/null
    fi
fi

# 2. 检查端口占用
PORT=$(grep -o '"port": *[0-9]*' "$HOME/.openclaw/openclaw.json" | grep -o '[0-9]*' | head -1)
if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
    log "⚠️ Port $PORT occupied, killing old process..."
    fuser -k $PORT/tcp 2>/dev/null
    sleep 1
fi

# 3. 清理临时文件
rm -rf /tmp/openclaw-* 2>/dev/null
log "Cleaned temp files"

# 4. 重新启动
log "Restarting gateway..."
systemctl --user restart openclaw-gateway
sleep 5

# 5. 检查状态
if systemctl --user is-active --quiet openclaw-gateway; then
    log "✅ Gateway restarted successfully"
    STATUS="✅ 已修复"
    COLOR="65280"
else
    log "❌ Gateway still failing - needs manual intervention"
    STATUS="❌ 需要人工介入"
    COLOR="16711680"
fi

# Discord 通知
if [ -n "$DISCORD_WEBHOOK" ] && command -v curl &> /dev/null; then
    curl -sS -X POST "$DISCORD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"embeds\": [{
                \"title\": \"🔧 OpenClaw 自动修复\",
                \"description\": \"状态: $STATUS\",
                \"color\": \"$COLOR\",
                \"timestamp\": \"$(date -Iseconds)\"
            }]
        }"
fi

log "=== Auto-fix complete ==="
