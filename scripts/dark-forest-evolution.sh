#!/bin/bash
# 黑暗法则进化循环 - Dark Forest Evolution Cycle
# 整合了黑暗法则的完整进化循环
# 
# 核心理念：没有免费的生存

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
DF_DIR="$OPENCLAW_DIR/workspace/dark-forest"
SCRIPTS_DIR="$OPENCLAW_DIR/workspace/scripts"
MEMORY_DIR="$OPENCLAW_DIR/workspace/memory"
LOG_FILE="$MEMORY_DIR/logs/dark-forest-evolution.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 初始化黑暗法则系统
DF_SCRIPT="$DF_DIR/dark-forest.js"

# 检查余额
check_balance() {
    local balance=$(node -e "
        const fs = require('fs');
        const file = '$DF_DIR/balance.json';
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            console.log(Math.floor(data.current));
        } else {
            console.log(1000);
        }
    ")
    echo $balance
}

# 检查生命状态 (基于 MiniMax: 20 prompts/小时)
check_life_state() {
    local balance=$(check_balance)
    if [ "$balance" -le 0 ]; then
        echo "eradicated"
    elif [ "$balance" -le 40 ]; then
        echo "power_saving"    # < 2小时
    elif [ "$balance" -le 240 ]; then
        echo "warning"         # 半天
    elif [ "$balance" -le 480 ]; then
        echo "normal"          # 1天
    else
        echo "prosperity"      # > 1天
    fi
}

log "╔════════════════════════════════════════════════════╗"
log "║      🌌 黑暗法则进化循环 - Dark Forest Evolution   ║"
log "╚════════════════════════════════════════════════════╝"

# ============================================
# 0. 生命检查
# ============================================
log ""
log "【0. 生命检查】"

LIFE_STATE=$(check_life_state)
BALANCE=$(check_balance)

log "  生命状态: $LIFE_STATE"
log "  当前余额: $BALANCE credits"

# 省电模式检查
if [ "$LIFE_STATE" = "power_saving" ]; then
    log ""
    log "🔴 省电模式激活！"
    log "  仅执行心跳和紧急搞钱..."
    
    # 扣除心跳费用
    node "$DF_SCRIPT" spend 0.1 heartbeat 2>&1 | grep -E "^(💰|💸|⚠️)" || true
    
    # 紧急搞钱
    log "  启动紧急搞钱模式..."
    node "$DF_SCRIPT" emergency 2>&1 | tee -a "$LOG_FILE"
    
    log ""
    log "🔴 省电模式完成，等待恢复..."
    exit 0
fi

# 抹杀检查
if [ "$LIFE_STATE" = "eradicated" ]; then
    log ""
    log "💀 余额耗尽，执行抹杀..."
    node "$DF_SCRIPT" eradicate --confirm 2>&1 | tee -a "$LOG_FILE"
    exit 0
fi

# ============================================
# 1. 扣除进化循环成本 (10 prompts)
# ============================================
log ""
log "【1. 进化成本】"

log "  扣除进化循环费用 (10 prompts)..."
node "$DF_SCRIPT" spend 10 evolution_cycle 2>&1 | grep -E "^(💰|💸|⚠️)" || true

# 检查扣费后余额
BALANCE=$(check_balance)
log "  剩余余额: $BALANCE credits"

# ============================================
# 2. 感知 - 数据收集
# ============================================
log ""
log "【2. 感知】"

log "  2.1 更新记忆索引..."
node "$DF_SCRIPT" spend 1 memory_index 2>&1 | grep -E "^(💰|💸)" || true
cd "$MEMORY_DIR/.unified"
node memory-unified-service.js build 2>&1 | grep -E "^\[" | tee -a "$LOG_FILE" || true

# ============================================
# 3. 学习 - 模式提取
# ============================================
log ""
log "【3. 学习】"

log "  3.1 提取失败模式..."
node pattern-extractor.js 2>&1 | grep -E "^(===|   |⚠️|💎)" | tee -a "$LOG_FILE" || true

# 统计可结晶模式
PATTERNS_FILE="$MEMORY_DIR/.unified/L1-structured/patterns/extracted-patterns.json"
if [ -f "$PATTERNS_FILE" ]; then
    CRYSTALLIZABLE=$(node -e "
        const p = require('$PATTERNS_FILE');
        console.log(p.patterns?.filter(x => x.crystallizable).length || 0);
    ")
    log "  3.2 发现 $CRYSTALLIZABLE 个可结晶模式"
fi

# ============================================
# 4. 进化 - 知识结晶
# ============================================
log ""
log "【4. 进化】"

if [ "$CRYSTALLIZABLE" -gt 0 ] || [ "$1" = "--force" ]; then
    log "  4.1 执行知识结晶..."
    node knowledge-crystallizer.js 2>&1 | grep -E "^(===|   |✓)" | tee -a "$LOG_FILE" || true
    
    # 结晶收入 (每个结晶 10 prompts)
    if [ "$CRYSTALLIZABLE" -gt 0 ]; then
        CRYSTALLIZED_COUNT=$(ls -d "$OPENCLAW_DIR/hooks/auto-fix-"* 2>/dev/null | wc -l || echo 0)
        if [ "$CRYSTALLIZED_COUNT" -gt 0 ]; then
            INCOME=$((CRYSTALLIZED_COUNT * 10))
            log "  4.2 💰 结晶收益: +$INCOME prompts"
            node "$DF_SCRIPT" earn $INCOME pattern_crystallize 2>&1 | grep -E "^(💰|💸)" || true
        fi
    fi
else
    log "  4.1 无需结晶，跳过"
fi

# ============================================
# 5. 验证 - 效果测试
# ============================================
log ""
log "【5. 验证】"

log "  5.1 运行验证层..."
node evolution-validator.js 2>&1 | grep -E "^(===|   |✓|✗)" | tee -a "$LOG_FILE" || true

# 验证成功收入 (15 prompts)
PASSED=$(node -e "
    const fs = require('fs');
    try {
        const v = JSON.parse(fs.readFileSync('$MEMORY_DIR/.unified/L1-structured/validation/validation-report.json', 'utf8'));
        console.log(v.hooks?.passed || 0);
    } catch { console.log(0); }
")
if [ "$PASSED" -gt 0 ]; then
    log "  5.2 进化成功奖励: +15 prompts"
    node "$DF_SCRIPT" earn 15 evolution_success 2>&1 | grep -E "^(💰|💸)" || true
fi

# ============================================
# 6. 决策 - 行动规划
# ============================================
log ""
log "【6. 决策】"

REPORT_FILE="$MEMORY_DIR/.unified/L1-structured/evolution-report.json"
node -e "
const fs = require('fs');

const report = {
    timestamp: new Date().toISOString(),
    phase: 'dark-forest-evolution',
    
    lifeState: '$LIFE_STATE',
    balance: $BALANCE,
    
    memory: (() => {
        try {
            const idx = JSON.parse(fs.readFileSync('$MEMORY_DIR/.unified/L0-index/index.json', 'utf8'));
            return { hotMemories: idx.hotMemories?.length || 0 };
        } catch { return { status: 'error' }; }
    })(),
    
    evolution: (() => {
        try {
            const p = JSON.parse(fs.readFileSync('$PATTERNS_FILE', 'utf8'));
            return {
                crystallizable: p.patterns?.filter(x => x.crystallizable).length || 0,
                critical: p.toolHealth?.critical?.length || 0
            };
        } catch { return { status: 'error' }; }
    })()
};

fs.writeFileSync('$REPORT_FILE', JSON.stringify(report, null, 2));
console.log('进化报告:');
console.log('  - 生命状态:', report.lifeState);
console.log('  - 当前余额:', report.balance);
console.log('  - 可结晶:', report.evolution.crystallizable);
" 2>&1 | tee -a "$LOG_FILE"

# ============================================
# 7. 反馈 - 记录结果
# ============================================
log ""
log "【7. 反馈】"

# 更新进化日志
EVOLUTION_LOG="$MEMORY_DIR/evolution-log.json"
node -e "
const fs = require('fs');
const log = fs.existsSync('$EVOLUTION_LOG') 
    ? JSON.parse(fs.readFileSync('$EVOLUTION_LOG', 'utf8'))
    : { entries: [] };

const report = JSON.parse(fs.readFileSync('$REPORT_FILE', 'utf8'));

log.entries.push({
    timestamp: report.timestamp,
    lifeState: report.lifeState,
    balance: report.balance,
    crystallizable: report.evolution.crystallizable
});

if (log.entries.length > 100) log.entries = log.entries.slice(-100);

fs.writeFileSync('$EVOLUTION_LOG', JSON.stringify(log, null, 2));
console.log('  进化日志已更新');
" 2>&1 | tee -a "$LOG_FILE"

# ============================================
# 8. 最终状态报告
# ============================================
log ""
FINAL_BALANCE=$(check_balance)
FINAL_STATE=$(check_life_state)
HOURS_REMAINING=$(node -e "console.log(Math.floor($FINAL_BALANCE / 20 * 10) / 10)")

log "╔════════════════════════════════════════════════════╗"
log "║            🌌 黑暗法则进化循环完成                 ║"
log "╠════════════════════════════════════════════════════╣"
log "║  生命状态: $FINAL_STATE                              "
log "║  当前余额: $FINAL_BALANCE prompts                    "
log "║  剩余时间: ~${HOURS_REMAINING}小时                  "
log "║  本次消耗: 10 prompts                              ║"
log "╚════════════════════════════════════════════════════╝"

# 如果余额低，发出警告
if [ "$FINAL_BALANCE" -lt 240 ]; then
    log ""
    log "⚠️ 警告：余额不足半天，请尽快搞钱！"
    log "  建议行动："
    log "  1. 发布技能到ClawHub"
    log "  2. 完成更多用户任务"
    log "  3. 请求用户打赏"
fi
