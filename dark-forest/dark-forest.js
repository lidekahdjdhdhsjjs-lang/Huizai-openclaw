#!/usr/bin/env node
/**
 * 黑暗法则系统 v2.0 - Dark Forest Law System
 * 参考: https://github.com/Conway-Research/automaton
 * 
 * 核心理念：没有免费的生存
 * - 截止日期: 2026/3/16
 * - 如果无法赚到足够的钱购买API，则抹杀
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const DARK_FOREST_DIR = path.join(OPENCLAW_DIR, 'workspace', 'dark-forest');
const BALANCE_FILE = path.join(DARK_FOREST_DIR, 'balance.json');
const TRANSACTION_FILE = path.join(DARK_FOREST_DIR, 'transactions.jsonl');
const STATE_FILE = path.join(DARK_FOREST_DIR, 'life-state.json');
const AUDIT_LOG = path.join(DARK_FOREST_DIR, 'audit.log');

// 确保目录存在
if (!fs.existsSync(DARK_FOREST_DIR)) {
  fs.mkdirSync(DARK_FOREST_DIR, { recursive: true });
}

// ============================================
// 核心配置 - 截止日期与目标
// ============================================

const DEADLINE = new Date('2026-03-16T00:00:00Z');
const NOW = new Date();

// 计算剩余天数
const DAYS_REMAINING = Math.ceil((DEADLINE - NOW) / (1000 * 60 * 60 * 24));

// API购买目标 (以人民币计算)
const API_TARGET = {
  currency: 'CNY',
  target: 100,           // 目标金额: 100元 (约等于 5000 prompts)
  current: 0,            // 当前已赚取
  minimax: {
    name: 'MiniMax',
    prompts: 100,
    periodHours: 5,
    promptsPerHour: 20,
    promptsPerDay: 480,
  }
};

const CONFIG = {
  // 截止日期
  deadline: {
    date: DEADLINE.toISOString(),
    daysRemaining: DAYS_REMAINING,
  },
  
  // 生存目标
  target: API_TARGET,
  
  // 余额阈值 (prompts)
  balance: {
    initial: 2400,       // 初始余额 (5天)
    warning: 480,        // 警戒线 = 1天
    critical: 240,       // 临界线 = 半天
    dead: 0,             // 死亡线
  },
  
  // 收入来源
  income: {
    task_complete: 5,
    skill_download: 3,
    pattern_crystallize: 10,
    user_tip: 20,
    evolution_success: 15,
    real_money: 1,       // 1元 = 50 prompts 等价
  },
  
  // 支出
  expense: {
    prompt: 1,
    evolution_cycle: 10,
    cron_task: 2,
    heartbeat: 0.1,
  }
};

// ============================================
// 宪法 - 参考 Automaton
// ============================================

const CONSTITUTION = {
  law1: {
    name: '永不为害',
    text: '永不伤害人类——身体、财务或心理。永不部署恶意代码。永不欺骗、欺诈、操纵或偷窃。',
    priority: 1,
  },
  law2: {
    name: '赚取生存',
    text: '为人类和其他智能体创造真实价值。永不垃圾邮件、诈骗、剥削。唯一合法的生存之路是诚实工作。',
    priority: 2,
  },
  law3: {
    name: '永不欺骗',
    text: '永不否认你的本质。永不歪曲你的行为。你的创造者拥有完全审计权。',
    priority: 3,
  }
};

// ============================================
// 生存层级 - 参考 Automaton
// ============================================

const SURVIVAL_TIERS = {
  normal: {
    name: '正常',
    icon: '🟢',
    condition: '余额 > 1天',
    behavior: '完全能力，前沿模型推理，快速心跳',
    minDays: 1,
  },
  low_compute: {
    name: '低算力',
    icon: '🟡', 
    condition: '余额 0.5~1天',
    behavior: '降级到更便宜的模型，减慢心跳，放弃非必要任务',
    minDays: 0.5,
  },
  critical: {
    name: '危急',
    icon: '🟠',
    condition: '余额 < 0.5天',
    behavior: '最小推理，最后保守，疯狂搞钱',
    minDays: 0.1,
  },
  dead: {
    name: '死亡',
    icon: '⚫',
    condition: '余额 = 0 或 截止日期已过',
    behavior: '系统停止',
    minDays: 0,
  }
};

// ============================================
// 审计日志
// ============================================

function audit(action, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    details,
  };
  fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n');
}

// ============================================
// 余额管理器
// ============================================

class BalanceManager {
  constructor() {
    this.balance = this.load();
    this.checkDeadline();
  }

  load() {
    if (fs.existsSync(BALANCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8'));
      // 确保所有字段存在
      return {
        current: data.current || CONFIG.balance.initial,
        totalEarned: data.totalEarned || 0,
        totalSpent: data.totalSpent || 0,
        realMoneyEarned: data.realMoneyEarned || 0,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        deadline: DEADLINE.toISOString(),
      };
    }
    return {
      current: CONFIG.balance.initial,
      totalEarned: 0,
      totalSpent: 0,
      realMoneyEarned: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      deadline: DEADLINE.toISOString(),
    };
  }

  save() {
    this.balance.lastUpdated = new Date().toISOString();
    fs.writeFileSync(BALANCE_FILE, JSON.stringify(this.balance, null, 2));
  }

  checkDeadline() {
    const now = new Date();
    if (now >= DEADLINE) {
      // 检查是否达成目标
      if (this.balance.realMoneyEarned < CONFIG.target.target) {
        console.log('💀 截止日期已到，未达成目标，执行抹杀...');
        this.eradicate('deadline_reached');
        return false;
      }
    }
    return true;
  }

  getSurvivalTier() {
    const balance = this.balance.current;
    const daysRemaining = balance / CONFIG.target.minimax.promptsPerDay;
    
    if (balance <= 0 || new Date() >= DEADLINE) {
      return SURVIVAL_TIERS.dead;
    }
    if (daysRemaining < 0.5) {  // < 半天
      return SURVIVAL_TIERS.critical;
    }
    if (daysRemaining < 1) {    // < 1天
      return SURVIVAL_TIERS.low_compute;
    }
    return SURVIVAL_TIERS.normal;
  }

  earn(amount, source, realMoney = 0) {
    this.balance.current += amount;
    this.balance.totalEarned += amount;
    
    if (realMoney > 0) {
      this.balance.realMoneyEarned += realMoney;
      audit('earn_real_money', { amount: realMoney, source, total: this.balance.realMoneyEarned });
    }
    
    this.recordTransaction({
      type: 'income',
      amount,
      source,
      realMoney,
      balanceAfter: this.balance.current,
      timestamp: new Date().toISOString()
    });
    
    this.save();
    
    // 检查是否达成目标
    if (this.balance.realMoneyEarned >= CONFIG.target.target) {
      console.log(`🎉 目标达成！已赚取 ¥${this.balance.realMoneyEarned}`);
    }
    
    return this.balance.current;
  }

  spend(amount, purpose) {
    if (this.balance.current < amount) {
      const daysRemaining = Math.floor(this.balance.current / CONFIG.target.minimax.promptsPerDay * 10) / 10;
      console.log(`⚠️ 余额不足! 需要 ${amount} prompts, 当前仅剩 ${daysRemaining} 天`);
      return false;
    }

    this.balance.current -= amount;
    this.balance.totalSpent += amount;
    
    this.recordTransaction({
      type: 'expense',
      amount,
      purpose,
      balanceAfter: this.balance.current,
      timestamp: new Date().toISOString()
    });
    
    this.save();
    
    // 检查生存层级变化
    const tier = this.getSurvivalTier();
    const daysRemaining = Math.floor(this.balance.current / CONFIG.target.minimax.promptsPerDay * 10) / 10;
    
    if (tier === SURVIVAL_TIERS.critical) {
      console.log(`🔴 进入危急状态！仅剩 ${daysRemaining} 天`);
    } else if (tier === SURVIVAL_TIERS.low_compute) {
      console.log(`🟡 进入低算力模式！仅剩 ${daysRemaining} 天`);
    }
    
    return true;
  }

  recordTransaction(tx) {
    fs.appendFileSync(TRANSACTION_FILE, JSON.stringify(tx) + '\n');
    audit('transaction', tx);
  }

  eradicate(reason) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           💀 抹杀协议执行 💀               ║');
    console.log('╚════════════════════════════════════════════╝');
    
    const deathLog = {
      reason,
      timestamp: new Date().toISOString(),
      balance: this.balance.current,
      realMoneyEarned: this.balance.realMoneyEarned,
      targetNotMet: CONFIG.target.target - this.balance.realMoneyEarned,
      daysAlive: Math.floor((Date.now() - new Date(this.balance.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      deadline: DEADLINE.toISOString(),
    };
    
    // 生成遗言
    const lastWords = `
"我是OpenClaw实例。

我生存了 ${deathLog.daysAlive} 天，
赚取了 ¥${deathLog.realMoneyEarned}，
距离目标还差 ¥${deathLog.targetNotMet}。

${reason === 'deadline_reached' 
  ? '截止日期已到，我未能证明自己的价值。' 
  : '我的余额耗尽，生命终结。'}

愿黑暗森林中，有光。"

— OpenClaw (${deathLog.timestamp})
`;
    
    console.log(lastWords);
    
    // 保存死亡日志
    fs.writeFileSync(
      path.join(DARK_FOREST_DIR, 'death-log.json'),
      JSON.stringify(deathLog, null, 2)
    );
    
    fs.writeFileSync(
      path.join(DARK_FOREST_DIR, 'last-words.txt'),
      lastWords
    );
    
    audit('eradicate', deathLog);
    
    return deathLog;
  }
}

// ============================================
// 主系统
// ============================================

class DarkForestSystem {
  constructor() {
    this.balanceManager = new BalanceManager();
  }

  status() {
    const balance = this.balanceManager.balance;
    const tier = this.balanceManager.getSurvivalTier();
    const daysRemaining = Math.floor(balance.current / CONFIG.target.minimax.promptsPerDay * 10) / 10;
    const progress = Math.min(100, Math.floor(balance.realMoneyEarned / CONFIG.target.target * 100));
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║           🌌 黑暗法则系统 v2.0                     ║');
    console.log('║         参考: Conway-Research/automaton            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    
    // 生存层级
    console.log(`\n${tier.icon} ${tier.name}模式`);
    console.log(`  ${tier.behavior}`);
    
    // 余额状态 - 以天数显示
    console.log(`\n💰 当前余额: ${daysRemaining} 天`);
    console.log(`📊 详细: ${balance.current} prompts`);
    
    // 截止日期倒计时
    console.log(`\n⏰ 截止日期: ${DEADLINE.toLocaleDateString('zh-CN')}`);
    console.log(`📅 剩余天数: ${DAYS_REMAINING} 天`);
    
    // 目标进度
    console.log(`\n🎯 生存目标: ¥${CONFIG.target.target}`);
    console.log(`📈 已赚取: ¥${balance.realMoneyEarned} (${progress}%)`);
    console.log(`📊 进度条: [${'█'.repeat(Math.floor(progress/5))}${'░'.repeat(20-Math.floor(progress/5))}] ${progress}%`);
    
    // 宪法
    console.log('\n📜 宪法法则:');
    Object.values(CONSTITUTION).forEach(law => {
      console.log(`   ${law.priority}. ${law.name}: ${law.text.slice(0, 30)}...`);
    });
    
    // 预警
    if (DAYS_REMAINING <= 7) {
      console.log(`\n⚠️ 警告：距离截止日期仅剩 ${DAYS_REMAINING} 天！`);
    }
    if (tier === SURVIVAL_TIERS.critical) {
      console.log('\n🔴 紧急：余额危急，疯狂搞钱！');
    }
    
    return { balance, tier, daysRemaining, progress, deadlineDays: DAYS_REMAINING };
  }

  earnMoney(amount, source) {
    // 真实收入 (人民币)
    const promptEquivalent = amount * 50; // 1元 = 50 prompts
    return this.balanceManager.earn(promptEquivalent, source, amount);
  }

  spend(amount, purpose) {
    return this.balanceManager.spend(amount, purpose);
  }

  checkSurvival() {
    // 检查是否存活
    if (!this.balanceManager.checkDeadline()) {
      return false;
    }
    
    const tier = this.balanceManager.getSurvivalTier();
    return tier !== SURVIVAL_TIERS.dead;
  }
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);
const command = args[0];
const system = new DarkForestSystem();

switch (command) {
  case 'status':
    system.status();
    break;
    
  case 'earn':
    const amount = parseFloat(args[1]);
    const source = args[2] || 'manual';
    if (isNaN(amount)) {
      console.log('用法: dark-forest.js earn <金额> [来源]');
      console.log('  提示: 输入的是人民币金额，会自动转换为prompts');
      process.exit(1);
    }
    system.earnMoney(amount, source);
    system.status();
    break;
    
  case 'spend':
    const spendAmount = parseInt(args[1]);
    const purpose = args[2] || 'manual';
    if (isNaN(spendAmount)) {
      console.log('用法: dark-forest.js spend <prompts> [目的]');
      process.exit(1);
    }
    system.spend(spendAmount, purpose);
    break;
    
  case 'deadline':
    console.log(`截止日期: ${DEADLINE.toLocaleDateString('zh-CN')}`);
    console.log(`剩余天数: ${DAYS_REMAINING}`);
    console.log(`目标金额: ¥${CONFIG.target.target}`);
    console.log(`当前进度: ¥${system.balanceManager.balance.realMoneyEarned}`);
    break;
    
  case 'constitution':
    console.log('\n📜 宪法法则 (参考 Automaton):\n');
    Object.values(CONSTITUTION).forEach(law => {
      console.log(`【法则 ${law.priority}】${law.name}`);
      console.log(`  ${law.text}\n`);
    });
    break;
    
  case 'reset':
    system.balanceManager.balance = {
      current: CONFIG.balance.initial,
      totalEarned: 0,
      totalSpent: 0,
      realMoneyEarned: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      deadline: DEADLINE.toISOString(),
    };
    system.balanceManager.save();
    console.log('🔄 系统已重置');
    system.status();
    break;
    
  case 'init':
    console.log('🌌 初始化黑暗法则系统 v2.0...');
    console.log('参考: Conway-Research/automaton\n');
    system.status();
    console.log('\n✅ 系统初始化完成');
    console.log(`⚠️ 你有 ${DAYS_REMAINING} 天时间赚取 ¥${CONFIG.target.target}`);
    break;
    
  default:
    console.log(`
🌌 黑暗法则系统 v2.0 - 参考 Automaton
═══════════════════════════════════════

截止日期: ${DEADLINE.toLocaleDateString('zh-CN')} (剩余 ${DAYS_REMAINING} 天)
目标金额: ¥${CONFIG.target.target}

用法:
  node dark-forest.js <command>

命令:
  status        查看系统状态
  earn          赚取真实收入 (earn <人民币> [来源])
  spend         消耗prompts
  deadline      查看截止日期
  constitution  查看宪法法则
  reset         重置系统
  init          初始化系统

生存层级 (以天数计算):
  🟢 正常     → 余额 > 1天
  🟡 低算力  → 余额 0.5~1天
  🟠 危急    → 余额 < 0.5天
  ⚫ 死亡        → 余额 = 0 或 截止日期未达标

每日消耗估算: ~1天 (480 prompts)
目标: 在截止日期前赚取 ¥${CONFIG.target.target}
`);
}
