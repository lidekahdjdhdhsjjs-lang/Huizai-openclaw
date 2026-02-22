#!/bin/bash
# 实时监控系统 - 替代定时检查

LOG_FILE="$HOME/.openclaw/workspace/memory/realtime-monitor.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

log() {
    echo "[$(date)] $1"
}

# 1. 检查 Gateway
GATEWAY=$(systemctl --user is-active openclaw-gateway 2>/dev/null)
if [ "$GATEWAY" != "active" ]; then
    MSG="⚠️ Gateway DOWN: $GATEWAY"
    log "$MSG"
    [ -n "$DISCORD_WEBHOOK" ] && curl -sS -X POST "$DISCORD_WEBHOOK" -H "Content-Type: application/json" \
        -d "{\"content\":\"$MSG\"}" 2>/dev/null
fi

# 2. 检查磁盘
DISK=$(df -h ~/.openclaw | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK" -gt 90 ]; then
    MSG="⚠️ 磁盘不足: ${DISK}%"
    log "$MSG"
fi

# 3. 检查内存
MEM=$(free -m | awk 'NR==2{print $3}')
if [ "$MEM" -gt 14000 ]; then
    MSG="⚠️ 内存高: ${MEM}MB"
    log "$MSG"
fi

# 4. 检查最近错误
ERRORS=$(tail -100 ~/.openclaw/logs/*.log 2>/dev/null | grep -c "ERROR\|error\|fail" || echo 0)
if [ "$ERRORS" -gt 10 ]; then
    MSG="⚠️ 错误增多: $ERRORS"
    log "$MSG"
fi

# 记录
log "健康检查完成 | Gateway: $GATEWAY | Disk: ${DISK}% | Mem: ${MEM}MB | Errors: $ERRORS"
