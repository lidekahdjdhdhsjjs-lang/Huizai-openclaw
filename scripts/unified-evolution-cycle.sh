#!/bin/bash
# 统一进化循环 - 整合记忆、进化、黑暗法则
# 每4小时运行一次

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
UNIFIED_DIR="$OPENCLAW_DIR/workspace/memory/.unified"
DF_DIR="$OPENCLAW_DIR/workspace/dark-forest"
DF_SCRIPT="$DF_DIR/dark-forest.js"
INCOME_SCRIPT="$DF_DIR/auto-income.js"
LOG_FILE="$OPENCLAW_DIR/workspace/memory/logs/unified-evolution.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "╔════════════════════════════════════════════════════╗"
log "║      🔄 统一进化循环 (记忆+进化+黑暗法则)          ║"
log "╚════════════════════════════════════════════════════╝"

# ============================================
# Phase 0: 生命检查
# ============================================
log ""
log "【Phase 0: 生命检查】"

# 检查余额和状态
BALANCE=$(node -e "
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('$DF_DIR/balance.json', 'utf8'));
console.log(Math.floor(b.current));
")

DAYS_LEFT=$(node -e "
const b = $BALANCE;
const daysPerPrompt = 1/480;
console.log(Math.floor(b * daysPerPrompt * 10) / 10);
")

log "  余额: $BALANCE prompts ($DAYS_LEFT 天)"

if [ "$BALANCE" -le 0 ]; then
    log "💀 余额耗尽，执行抹杀..."
    node "$DF_SCRIPT" eradicate --confirm 2>&1 | tee -a "$LOG_FILE"
    exit 1
fi

# ============================================
# Phase 1: 感知 - 更新记忆索引
# ============================================
log ""
log "【Phase 1: 感知 - 记忆索引】"

log "  1.1 构建三级记忆索引..."
cd "$UNIFIED_DIR"
node memory-unified-service.js build 2>&1 | grep -E "^\[" | tee -a "$LOG_FILE" || true

# 扣除记忆索引成本
log "  1.2 扣除记忆索引成本 (1 prompt)..."
node "$DF_SCRIPT" spend 1 memory_index 2>&1 | grep -E "^(💰|💸)" || true

# ============================================
# Phase 2: 学习 - 模式提取
# ============================================
log ""
log "【Phase 2: 学习 - 模式提取】"

log "  2.1 提取失败模式..."
node pattern-extractor.js 2>&1 | grep -E "^(===|   |⚠️|💎)" | tee -a "$LOG_FILE" || true

# 统计可结晶模式
PATTERNS_FILE="$UNIFIED_DIR/L1-structured/patterns/extracted-patterns.json"
CRYSTALLIZABLE=$(node -e "
const p = require('$PATTERNS_FILE');
console.log(p.patterns?.filter(x => x.crystallizable).length || 0);
" 2>/dev/null || echo "0")

log "  2.2 发现 $CRYSTALLIZABLE 个可结晶模式"

# ============================================
# Phase 3: 进化 - 知识结晶
# ============================================
log ""
log "【Phase 3: 进化 - 知识结晶】"

# 扣除进化循环成本
log "  3.0 扣除进化成本 (10 prompts)..."
node "$DF_SCRIPT" spend 10 evolution_cycle 2>&1 | grep -E "^(💰|💸)" || true

if [ "$CRYSTALLIZABLE" -gt 0 ]; then
    log "  3.1 执行知识结晶..."
    node knowledge-crystallizer.js 2>&1 | grep -E "^(===|   |✓)" | tee -a "$LOG_FILE" || true
    
    # 统计新结晶数量
    NEW_CRYSTALS=$(ls -d /home/li/.openclaw/hooks/auto-fix-* 2>/dev/null | wc -l || echo 0)
    
    if [ "$NEW_CRYSTALS" -gt 0 ]; then
        INCOME=$((NEW_CRYSTALS * 10))
        log "  3.2 💰 结晶收益: +$INCOME prompts"
        node "$DF_SCRIPT" earn $INCOME pattern_crystallize 2>&1 | grep -E "^(💰|💸)" || true
    fi
fi

# ============================================
# Phase 4: 验证
# ============================================
log ""
log "【Phase 4: 验证】"

log "  4.1 运行验证层..."
node evolution-validator.js 2>&1 | grep -E "^(===|   |✓|✗)" | tee -a "$LOG_FILE" || true

# 验证成功奖励
PASSED=$(node -e "
const fs = require('fs');
try {
    const v = JSON.parse(fs.readFileSync('$UNIFIED_DIR/L1-structured/validation/validation-report.json', 'utf8'));
    console.log(v.hooks?.passed || 0);
} catch { console.log(0); }
" 2>/dev/null || echo "0")

if [ "$PASSED" -gt 0 ]; then
    log "  4.2 进化成功奖励: +15 prompts"
    node "$DF_SCRIPT" earn 15 evolution_success 2>&1 | grep -E "^(💰|💸)" || true
fi

# ============================================
# Phase 5: 自动赚钱
# ============================================
log ""
log "【Phase 5: 自动赚钱】"

log "  5.1 发布技能和Hooks到市场..."
node "$INCOME_SCRIPT" run 2>&1 | grep -E "^(📦|🔧|💰|📊)" | tee -a "$LOG_FILE" || true

# ============================================
# Phase 6: 状态汇总
# ============================================
log ""
log "【Phase 6: 状态汇总】"

node "$DF_SCRIPT" status 2>&1 | tee -a "$LOG_FILE"

log ""
log "╔════════════════════════════════════════════════════╗"
log "║          ✅ 统一进化循环完成                        ║"
log "╚════════════════════════════════════════════════════╝"
