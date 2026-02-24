#!/bin/bash
# OpenClaw 系统启动脚本
# 用途：初始化所有优化后的组件
# 用法：./system-init.sh [--quick]

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
SCRIPTS_DIR="$OPENCLAW_DIR/workspace/scripts"
LOG_FILE="$OPENCLAW_DIR/workspace/memory/logs/system-init.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

QUICK_MODE="${1:-}"

log "╔════════════════════════════════════════════════╗"
log "║     OpenClaw 优化系统初始化                    ║"
log "╚════════════════════════════════════════════════╝"

# ============================================
# 1. 记忆系统初始化
# ============================================
log ""
log "【1. 记忆系统】"

log "  1.1 构建三级记忆索引..."
cd "$OPENCLAW_DIR/workspace/memory/.unified"
node memory-unified-service.js build 2>&1 | grep -E "^\[" | tee -a "$LOG_FILE" || true

if [ "$QUICK_MODE" != "--quick" ]; then
    log "  1.2 运行记忆维护..."
    bash "$SCRIPTS_DIR/memory-index-maintenance.sh" 2>&1 | grep -E "^(===|\[)" | tee -a "$LOG_FILE" || true
fi

# ============================================
# 2. 进化系统初始化
# ============================================
log ""
log "【2. 进化系统】"

log "  2.1 提取模式..."
node pattern-extractor.js 2>&1 | grep -E "^(===|   |⚠️|💎)" | tail -10 | tee -a "$LOG_FILE" || true

log "  2.2 知识结晶..."
node knowledge-crystallizer.js 2>&1 | grep -E "^(===|   |✓)" | tee -a "$LOG_FILE" || true

log "  2.3 验证结晶..."
node evolution-validator.js 2>&1 | grep -E "^(===|   |✓|✗)" | tee -a "$LOG_FILE" || true

# ============================================
# 3. 监控系统初始化
# ============================================
log ""
log "【3. 监控系统】"

log "  3.1 心跳检查..."
node "$SCRIPTS_DIR/heartbeat-monitor.js" 2>&1 | grep -E "^(===|  [✅❌⚠️]|时间)" | tee -a "$LOG_FILE" || true

# ============================================
# 4. 跨实例协调
# ============================================
log ""
log "【4. 跨实例协调】"

log "  4.1 检查协调状态..."
node "$SCRIPTS_DIR/cross-instance-coord.js" all 2>&1 | grep -E "^(===|[0-9]|   )" | tee -a "$LOG_FILE" || true

# ============================================
# 5. 生成系统报告
# ============================================
log ""
log "【5. 系统报告】"

REPORT_FILE="$OPENCLAW_DIR/workspace/memory/system-report.json"
node -e "
const fs = require('fs');
const path = require('path');

const report = {
    generatedAt: new Date().toISOString(),
    
    memory: (() => {
        try {
            const idx = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/workspace/memory/.unified/L0-index/index.json', 'utf8'));
            return {
                hotMemories: idx.hotMemories?.length || 0,
                toolHealth: Object.keys(idx.toolHealth || {}).length,
                healthy: Object.values(idx.toolHealth || {}).filter(t => t.status === 'healthy').length,
                critical: Object.values(idx.toolHealth || {}).filter(t => t.status === 'critical').length
            };
        } catch { return { status: 'error' }; }
    })(),
    
    evolution: (() => {
        try {
            const patterns = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/workspace/memory/.unified/L1-structured/patterns/extracted-patterns.json', 'utf8'));
            return {
                patterns: patterns.patterns?.length || 0,
                crystallizable: patterns.patterns?.filter(p => p.crystallizable).length || 0,
                recommendations: patterns.recommendations?.length || 0
            };
        } catch { return { status: 'error' }; }
    })(),
    
    hooks: (() => {
        try {
            const hooksDir = '$OPENCLAW_DIR/hooks';
            return fs.readdirSync(hooksDir, { withFileTypes: true })
                .filter(d => d.isDirectory()).length;
        } catch { return 0; }
    })(),
    
    skills: (() => {
        try {
            const skillsDir = '$OPENCLAW_DIR/skills';
            return fs.readdirSync(skillsDir, { withFileTypes: true })
                .filter(d => d.isDirectory()).length;
        } catch { return 0; }
    })(),
    
    cron: (() => {
        try {
            const cron = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/cron/jobs.json', 'utf8'));
            return {
                total: cron.jobs.length,
                enabled: cron.jobs.filter(j => j.enabled).length
            };
        } catch { return { status: 'error' }; }
    })()
};

fs.writeFileSync('$REPORT_FILE', JSON.stringify(report, null, 2));

console.log('系统状态:');
console.log('  - 热点记忆:', report.memory.hotMemories);
console.log('  - 工具健康:', report.memory.healthy + '/' + report.memory.toolHealth);
console.log('  - 可结晶模式:', report.evolution.crystallizable);
console.log('  - Hooks:', report.hooks);
console.log('  - Skills:', report.skills);
console.log('  - Cron任务:', report.cron.enabled + '/' + report.cron.total);
" 2>&1 | tee -a "$LOG_FILE"

log ""
log "╔════════════════════════════════════════════════╗"
log "║     系统初始化完成！                           ║"
log "╚════════════════════════════════════════════════╝"
log ""
log "接下来可以："
log "  1. 运行进化循环: bash $SCRIPTS_DIR/evolution-cycle.sh"
log "  2. 查看系统报告: cat $REPORT_FILE"
log "  3. 检查心跳状态: node $SCRIPTS_DIR/heartbeat-monitor.js"
