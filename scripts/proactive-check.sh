#!/bin/bash
# 主动检查脚本 - 每小时检查系统状态，发现问题自动修复
# 整合到 cron

LOG_FILE="$HOME/.openclaw/workspace/memory/system-check.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

log() {
    echo "[$(date)] $1"
}

# 1. 检查 Gateway 状态
log "检查 Gateway 状态..."
GATEWAY_STATUS=$(systemctl --user is-active openclaw-gateway 2>/dev/null)
if [ "$GATEWAY_STATUS" != "active" ]; then
    log "⚠️ Gateway 不活跃，尝试重启..."
    systemctl --user restart openclaw-gateway
    sleep 3
    GATEWAY_STATUS=$(systemctl --user is-active openclaw-gateway 2>/dev/null)
    
    if [ "$GATEWAY_STATUS" = "active" ]; then
        log "✅ Gateway 已恢复"
        STATUS="✅ Gateway 故障已自动修复"
    else
        log "❌ Gateway 恢复失败"
        STATUS="❌ Gateway 需要人工介入"
    fi
else
    log "✅ Gateway 正常"
    STATUS="✅ 系统正常"
fi

# 2. 检查磁盘空间
DISK_USAGE=$(df -h ~/.openclaw | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log "⚠️ 磁盘空间不足: ${DISK_USAGE}%"
    STATUS="$STATUS | ⚠️ 磁盘: ${DISK_USAGE}%"
fi

# 3. 检查 Token 余额
log "检查 Token 余额..."
TOKEN_USAGE=$(curl -sS --proxy http://127.0.0.1:7897 \
    "https://api.vectorengine.ai/v1/dashboard/billing/usage" \
    -H "Authorization: Bearer sk-PwKfkXA9DxW49n5dY56tvfOTPXGSr7AiiubsdLAoYoCdMCsN" \
    2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('total_usage',0))" 2>/dev/null || echo "0")

log "Token 已用: \$$TOKEN_USAGE"

# 4. 检查最近错误
RECENT_ERRORS=$(tail -50 ~/.openclaw/logs/*.log 2>/dev/null | grep -c "ERROR" || echo 0)
log "最近错误数: $RECENT_ERRORS"

# 记录
echo "$(date '+%Y-%m-%d %H:%M') | $STATUS | Token: \$$TOKEN_USAGE | Errors: $RECENT_ERRORS" >> "$LOG_FILE"

# Discord 通知（可选）
if [ -n "$DISCORD_WEBHOOK" ]; then
    curl -sS -X POST "$DISCORD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"embeds\": [{
                \"title\": \"🔍 系统主动检查\",
                \"description\": \"$STATUS\",
                \"fields\": [
                    {\"name\": \"Token已用\", \"value\": \"\$$TOKEN_USAGE\", \"inline\": true},
                    {\"name\": \"最近错误\", \"value\": \"$RECENT_ERRORS\", \"inline\": true},
                    {\"name\": \"磁盘使用\", \"value\": \"${DISK_USAGE}%\", \"inline\": true}
                ],
                \"timestamp\": \"$(date -Iseconds)\"
            }]
        }" 2>/dev/null
fi

log "=== 检查完成 ==="
