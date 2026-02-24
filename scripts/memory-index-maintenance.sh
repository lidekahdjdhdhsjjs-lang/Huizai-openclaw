#!/bin/bash
# 记忆索引维护脚本 - Memory Index Maintenance
# 用途：每日运行，维护三级记忆架构
# 建议cron: 0 3 * * * (每天凌晨3点)

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
MEMORY_DIR="$OPENCLAW_DIR/workspace/memory"
UNIFIED_DIR="$MEMORY_DIR/.unified"
LOG_FILE="$MEMORY_DIR/logs/index-maintenance.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 记忆索引维护开始 ==="

# 1. 构建三级索引
log "1. 构建三级索引..."
cd "$UNIFIED_DIR"
node memory-unified-service.js build 2>&1 | tee -a "$LOG_FILE"

# 2. 清理过期记忆 (L2 -> archive)
log "2. 清理过期记忆..."
ARCHIVE_DIR="$MEMORY_DIR/archive"
mkdir -p "$ARCHIVE_DIR"

# 30天前的.md文件移到archive
find "$MEMORY_DIR" -maxdepth 1 -name "*.md" -type f -mtime +30 | while read file; do
    filename=$(basename "$file")
    if [[ ! "$filename" =~ ^2026-02 ]] && [[ ! "$filename" =~ ^_ ]]; then
        mv "$file" "$ARCHIVE_DIR/"
        log "  Archived: $filename"
    fi
done

# 3. 压缩日志文件
log "3. 压缩日志..."
find "$MEMORY_DIR" -name "*.log" -type f -size +100k | while read logfile; do
    gzip -f "$logfile" 2>/dev/null || true
    log "  Compressed: $(basename $logfile)"
done

# 4. 清理L1中的重复模式
log "4. 清理重复模式..."
PATTERNS_FILE="$UNIFIED_DIR/L1-structured/patterns/high-frequency.json"
if [ -f "$PATTERNS_FILE" ]; then
    # 使用node去重
    node -e "
        const fs = require('fs');
        const p = '$PATTERNS_FILE';
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const seen = new Set();
        data.topPatterns = data.topPatterns.filter(item => {
            if (seen.has(item.pattern)) return false;
            seen.add(item.pattern);
            return true;
        });
        fs.writeFileSync(p, JSON.stringify(data, null, 2));
        console.log('Deduplicated patterns: ' + data.topPatterns.length);
    " 2>&1 | tee -a "$LOG_FILE"
fi

# 5. 更新记忆统计
log "5. 更新统计..."
STATS_FILE="$UNIFIED_DIR/stats.json"
node -e "
    const fs = require('fs');
    const path = require('path');
    
    const memoryDir = '$MEMORY_DIR';
    const foundryDir = '$OPENCLAW_DIR/foundry';
    
    const stats = {
        updatedAt: new Date().toISOString(),
        memory: {
            files: fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).length,
            sizeKB: Math.round(fs.readdirSync(memoryDir)
                .filter(f => f.endsWith('.md') || f.endsWith('.json'))
                .reduce((sum, f) => {
                    try { return sum + fs.statSync(path.join(memoryDir, f)).size; }
                    catch { return sum; }
                }, 0) / 1024)
        },
        foundry: {
            learnings: (() => {
                try {
                    const l = JSON.parse(fs.readFileSync(path.join(foundryDir, 'learnings.json'), 'utf8'));
                    return l.length;
                } catch { return 0; }
            })()
        }
    };
    
    fs.writeFileSync('$STATS_FILE', JSON.stringify(stats, null, 2));
    console.log(JSON.stringify(stats, null, 2));
" 2>&1 | tee -a "$LOG_FILE"

log "=== 记忆索引维护完成 ==="
