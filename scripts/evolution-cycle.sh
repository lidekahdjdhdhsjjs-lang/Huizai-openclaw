#!/bin/bash
# 完整进化循环 - Complete Evolution Cycle
# 整合: 模式提取 → 知识结晶 → 验证 → 应用
# 
# 建议 cron: 0 */4 * * * (每4小时)

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
UNIFIED_DIR="$OPENCLAW_DIR/workspace/memory/.unified"
LOG_FILE="$OPENCLAW_DIR/workspace/memory/logs/evolution-cycle.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "╔══════════════════════════════════════════╗"
log "║       完整进化循环开始                    ║"
log "╚══════════════════════════════════════════╝"

# ============================================
# Phase 1: 感知 - 数据收集
# ============================================
log ""
log "【Phase 1: 感知】"

# 更新记忆索引
log "  1.1 更新记忆索引..."
cd "$UNIFIED_DIR"
node memory-unified-service.js build 2>&1 | grep -E "^\[" | tee -a "$LOG_FILE" || true

# ============================================
# Phase 2: 学习 - 模式提取
# ============================================
log ""
log "【Phase 2: 学习】"

log "  2.1 提取失败模式..."
node pattern-extractor.js 2>&1 | grep -E "^(===|   |⚠️|💎)" | tee -a "$LOG_FILE" || true

# 检查是否有可结晶模式
PATTERNS_FILE="$UNIFIED_DIR/L1-structured/patterns/extracted-patterns.json"
if [ -f "$PATTERNS_FILE" ]; then
    CRYSTALLIZABLE=$(node -e "
        const p = require('$PATTERNS_FILE');
        console.log(p.patterns?.filter(x => x.crystallizable).length || 0);
    ")
    log "  2.2 发现 $CRYSTALLIZABLE 个可结晶模式"
fi

# ============================================
# Phase 3: 进化 - 知识结晶
# ============================================
log ""
log "【Phase 3: 进化】"

if [ "$CRYSTALLIZABLE" -gt 0 ] || [ "$1" = "--force" ]; then
    log "  3.1 执行知识结晶..."
    node knowledge-crystallizer.js 2>&1 | grep -E "^(===|   |✓)" | tee -a "$LOG_FILE" || true
else
    log "  3.1 无需结晶，跳过"
fi

# ============================================
# Phase 4: 验证 - 效果测试
# ============================================
log ""
log "【Phase 4: 验证】"

log "  4.1 运行验证层..."
node evolution-validator.js 2>&1 | grep -E "^(===|   |✓|✗|建议)" | tee -a "$LOG_FILE" || true

# ============================================
# Phase 5: 决策 - 行动规划
# ============================================
log ""
log "【Phase 5: 决策】"

# 生成进化报告
REPORT_FILE="$UNIFIED_DIR/L1-structured/evolution-report.json"
node -e "
const fs = require('fs');
const path = require('path');

const report = {
    timestamp: new Date().toISOString(),
    phase: 'evolution-cycle',
    
    memory: (() => {
        try {
            const idx = JSON.parse(fs.readFileSync('$UNIFIED_DIR/L0-index/index.json', 'utf8'));
            return {
                hotMemories: idx.hotMemories?.length || 0,
                toolHealth: Object.keys(idx.toolHealth || {}).length
            };
        } catch { return { status: 'error' }; }
    })(),
    
    patterns: (() => {
        try {
            const p = JSON.parse(fs.readFileSync('$PATTERNS_FILE', 'utf8'));
            return {
                total: p.patterns?.length || 0,
                crystallizable: p.patterns?.filter(x => x.crystallizable).length || 0,
                critical: p.toolHealth?.critical?.length || 0,
                degraded: p.toolHealth?.degraded?.length || 0
            };
        } catch { return { status: 'error' }; }
    })(),
    
    crystallized: (() => {
        try {
            const c = JSON.parse(fs.readFileSync('$UNIFIED_DIR/L1-structured/crystallized/crystallization-record.json', 'utf8'));
            return {
                hooks: c.hooks?.length || 0,
                skills: c.skills?.length || 0
            };
        } catch { return { hooks: 0, skills: 0 }; }
    })(),
    
    validation: (() => {
        try {
            const v = JSON.parse(fs.readFileSync('$UNIFIED_DIR/L1-structured/validation/validation-report.json', 'utf8'));
            return {
                passed: v.hooks?.passed || 0,
                failed: v.hooks?.failed || 0
            };
        } catch { return { status: 'error' }; }
    })()
};

fs.writeFileSync('$REPORT_FILE', JSON.stringify(report, null, 2));

// 输出摘要
console.log('进化报告:');
console.log('  - 热点记忆:', report.memory.hotMemories);
console.log('  - 可结晶模式:', report.patterns.crystallizable);
console.log('  - 新生成Hooks:', report.crystallized.hooks);
console.log('  - 验证通过:', report.validation.passed + '/' + (report.validation.passed + report.validation.failed));
" 2>&1 | tee -a "$LOG_FILE"

# ============================================
# Phase 6: 反馈 - 记录结果
# ============================================
log ""
log "【Phase 6: 反馈】"

# 更新进化日志
EVOLUTION_LOG="$OPENCLAW_DIR/workspace/memory/evolution-log.json"
node -e "
const fs = require('fs');
const log = fs.existsSync('$EVOLUTION_LOG') 
    ? JSON.parse(fs.readFileSync('$EVOLUTION_LOG', 'utf8'))
    : { entries: [] };

const report = JSON.parse(fs.readFileSync('$REPORT_FILE', 'utf8'));

log.entries.push({
    timestamp: report.timestamp,
    crystallizable: report.patterns.crystallizable,
    hooksGenerated: report.crystallized.hooks,
    validationPassed: report.validation.passed
});

// 只保留最近100条
if (log.entries.length > 100) log.entries = log.entries.slice(-100);

fs.writeFileSync('$EVOLUTION_LOG', JSON.stringify(log, null, 2));
console.log('  进化日志已更新');
" 2>&1 | tee -a "$LOG_FILE"

log ""
log "╔══════════════════════════════════════════╗"
log "║       进化循环完成                        ║"
log "╚══════════════════════════════════════════╝"
