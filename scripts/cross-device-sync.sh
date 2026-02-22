#!/bin/bash
# 跨设备任务同步脚本

# 辉仔 IP
HUIJAI_IP="192.168.1.16"
USER="li"

log() {
    echo "[$(date)] $1"
}

log "=== 跨设备同步开始 ==="

# 1. 同步 cron 任务状态
log "同步 cron 任务..."

# 2. 同步关键记忆文件
log "同步记忆文件..."
rsync -avz --progress \
    ~/.openclaw/workspace/memory/ \
    $USER@$HUIJAI_IP:~/.openclaw/workspace/memory/ 2>/dev/null || \
    log "注意: SSH 连接可能需要密钥"

# 3. 同步配置变更
log "同步配置..."
rsync -avz --progress \
    ~/.openclaw/openclaw.json \
    $USER@$HUIJAI_IP:~/.openclaw/openclaw.json 2>/dev/null || true

# 4. 互相检查状态
log "检查远程状态..."
ssh $USER@$HUIJAI_IP "systemctl --user is-active openclaw-gateway" 2>/dev/null || log "远程检查失败"

log "=== 同步完成 ==="
