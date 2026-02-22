#!/bin/bash
# 问题自动发现和修复脚本
# 识别常见问题并尝试自动修复

LOG_FILE="$HOME/.openclaw/workspace/memory/auto-fix.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

FIXED=0
ISSUES=""

# 1. 检查配置错误
log "检查配置错误..."
if python3 -c "import json; json.load(open('$HOME/.openclaw/openclaw.json'))" 2>/dev/null; then
    log "✅ 配置JSON正常"
else
    log "❌ 配置JSON错误，尝试恢复..."
    cp "$HOME/.openclaw/openclaw.json.bak" "$HOME/.openclaw/openclaw.json" 2>/dev/null && \
        FIXED=$((FIXED+1)) && ISSUES="${ISSUES}配置已恢复;"
fi

# 2. 检查端口占用
log "检查端口..."
PORT=$(grep -o '"port": *[0-9]*' "$HOME/.openclaw/openclaw.json" | grep -o '[0-9]*' | head -1)
if ss -tuln 2>/dev/null | grep -q ":$PORT " || netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    log "⚠️ 端口 $PORT 被占用，尝试释放..."
    fuser -k $PORT/tcp 2>/dev/null
    sleep 2
    if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        ISSUES="${ISSUES}端口释放失败;"
    else
        FIXED=$((FIXED+1))
        ISSUES="${ISSUES}端口已释放;"
        log "✅ 端口已释放"
    fi
else
    log "✅ 端口正常"
fi

# 3. 检查内存泄漏风险
log "检查内存..."
MEM_USAGE=$(free -m 2>/dev/null | awk 'NR==2{print $3}' || echo 0)
if [ "$MEM_USAGE" -gt 8000 ]; then
    log "⚠️ 内存使用较高: ${MEM_USAGE}MB"
    # 清理缓存
    sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null
    ISSUES="${ISSUES}内存已清理;"
else
    log "✅ 内存正常: ${MEM_USAGE}MB"
fi

# 4. 检查失效的Cron任务
log "检查Cron任务..."
ERROR_CRONS=$(openclaw cron list 2>/dev/null | grep -c "error" || echo 0)
if [ "$ERROR_CRONS" -gt 0 ]; then
    log "⚠️ 发现 $ERROR_CRONS 个错误状态的任务"
    ISSUES="${ISSUES}$ERROR_CRONS个任务出错;"
else
    log "✅ Cron任务正常"
fi

# 5. 检查Token余额
log "检查Token..."
TOKEN_USAGE=$(curl -sS --proxy http://127.0.0.1:7897 \
    "https://api.vectorengine.ai/v1/dashboard/billing/usage" \
    -H "Authorization: Bearer sk-PwKfkXA9DxW49n5dY56tvfOTPXGSr7AiiubsdLAoYoCdMCsN" \
    2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('total_usage',0))" 2>/dev/null || echo "0")

if [ "$TOKEN_USAGE" = "0" ]; then
    ISSUES="${ISSUES}Token查询失败;"
else
    log "✅ Token已用: \$$TOKEN_USAGE"
fi

# 6. 检查最近失败的工具调用
log "检查工具失败..."
RECENT_FAILURES=$(tail -100 ~/.openclaw/logs/*.log 2>/dev/null | grep -c "failed\|error\|Error" || echo 0)
if [ "$RECENT_FAILURES" -gt 20 ]; then
    log "⚠️ 最近失败较多: $RECENT_FAILURES"
    ISSUES="${ISSUES}失败数:$RECENT_FAILURES;"
else
    log "✅ 失败数正常: $RECENT_FAILURES"
fi

# 总结
log "=== 自动检查完成 ==="
log "修复: $FIXED 个问题"

# Discord 通知
if [ -n "$DISCORD_WEBHOOK" ]; then
    if [ "$FIXED" -gt 0 ] || [ -n "$ISSUES" ]; then
        curl -sS -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"embeds\": [{
                    \"title\": \"🔧 问题自动发现\",
                    \"description\": \"修复: $FIXED 个 | 问题: $ISSUES\",
                    \"color\": \"$([ $FIXED -gt 0 ] && echo '65280' || echo '16711680')\",
                    \"timestamp\": \"$(date -Iseconds)\"
                }]
            }" 2>/dev/null
    fi
fi
