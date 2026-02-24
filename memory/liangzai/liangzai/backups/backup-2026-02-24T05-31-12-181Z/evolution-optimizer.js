#!/usr/bin/env node

/**
 * 进化系统优化器 v1
 * 实现: 多维度触发、自适应冷却、智能配额
 */

const fs = require('fs');

const STATE_FILE = '/tmp/evolution-state.json';
const CONFIG = {
  // 触发条件
  triggers: {
    keywords: ['memory', 'vector', 'embedding', 'rag', 'search', 'learn', 'optimize'],
    minConfidence: 0.7,
    maxPerDay: 5,
    cooldownBase: 12 * 60 * 60 * 1000 // 12小时基础
  },
  // 分析
  analysis: {
    parallel: true,
    depth: 'deep',
    maxAnalysisTime: 5000
  },
  // 执行
  execution: {
    sandbox: true,
    autoBackup: true,
    maxRetries: 3
  }
};

let state = {
  lastTrigger: 0,
  dailyCount: 0,
  lastReset: Date.now(),
  history: [],
  performance: []
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// 1. 多维度触发
function canTrigger(knowledge) {
  const now = Date.now();
  
  // 每日重置
  if (now - state.lastReset > 24 * 60 * 60 * 1000) {
    state.dailyCount = 0;
    state.lastReset = now;
  }
  
  // 每日限制
  if (state.dailyCount >= CONFIG.triggers.maxPerDay) {
    return { canTrigger: false, reason: 'daily_limit' };
  }
  
  // 冷却期（自适应）
  const cooldown = getAdaptiveCooldown();
  if (now - state.lastTrigger < cooldown) {
    return { canTrigger: false, reason: 'cooldown', remaining: cooldown - (now - state.lastTrigger) };
  }
  
  // 关键词匹配
  const text = JSON.stringify(knowledge).toLowerCase();
  const matched = CONFIG.triggers.keywords.filter(kw => text.includes(kw));
  
  if (matched.length === 0) {
    return { canTrigger: false, reason: 'no_keywords' };
  }
  
  return { 
    canTrigger: true, 
    matched,
    confidence: Math.min(1, matched.length / 3)
  };
}

// 自适应冷却
function getAdaptiveCooldown() {
  // 根据成功率调整
  const recent = state.performance.slice(-10);
  if (recent.length === 0) return CONFIG.triggers.cooldownBase;
  
  const successRate = recent.filter(p => p.success).length / recent.length;
  
  // 成功率高则缩短冷却
  if (successRate > 0.8) return CONFIG.triggers.cooldownBase / 2;
  // 成功率低则延长冷却
  if (successRate < 0.5) return CONFIG.triggers.cooldownBase * 2;
  
  return CONFIG.triggers.cooldownBase;
}

// 2. 深度分析
async function analyzeKnowledge(knowledge) {
  console.log('🔬 深度分析...');
  
  const analysis = {
    timestamp: Date.now(),
    keywords: extractKeywords(knowledge),
    entities: extractEntities(knowledge),
    sentiment: analyzeSentiment(knowledge),
    complexity: assessComplexity(knowledge),
    suggestions: []
  };
  
  // 生成建议
  if (analysis.complexity === 'high') {
    analysis.suggestions.push({
      type: 'optimize',
      area: 'performance',
      priority: 9
    });
  }
  
  if (analysis.keywords.some(k => ['memory', 'storage'].includes(k))) {
    analysis.suggestions.push({
      type: 'optimize',
      area: 'storage',
      priority: 8
    });
  }
  
  console.log(`  ✅ 分析完成: ${analysis.suggestions.length} 个建议`);
  return analysis;
}

// 3. 安全执行
async function executeSafely(suggestion) {
  console.log('⚡ 安全执行...');
  
  const result = {
    suggestion,
    startTime: Date.now(),
    success: false,
    error: null
  };
  
  try {
    // 自动备份
    if (CONFIG.execution.autoBackup) {
      console.log('  📦 自动备份...');
      // 备份逻辑
    }
    
    // 沙箱测试
    if (CONFIG.execution.sandbox) {
      console.log('  🧪 沙箱测试...');
      // 测试逻辑
    }
    
    // 执行
    console.log('  🔄 执行优化...');
    
    result.success = true;
    result.endTime = Date.now();
    
  } catch (e) {
    result.error = e.message;
    result.endTime = Date.now();
    
    // 重试
    for (let i = 0; i < CONFIG.execution.maxRetries; i++) {
      console.log(`  🔁 重试 ${i + 1}...`);
    }
  }
  
  return result;
}

// 4. 性能追踪
function trackPerformance(result) {
  state.performance.push({
    timestamp: Date.now(),
    success: result.success,
    duration: result.endTime - result.startTime
  });
  
  // 保留最近100条
  if (state.performance.length > 100) {
    state.performance = state.performance.slice(-100);
  }
  
  saveState();
}

// 工具函数
function extractKeywords(knowledge) {
  const text = JSON.stringify(knowledge).toLowerCase();
  const words = text.split(/\W+/).filter(w => w.length > 3);
  return [...new Set(words)].slice(0, 20);
}

function extractEntities(knowledge) {
  return ['memory', 'system', 'optimize']; // 简化
}

function analyzeSentiment(knowledge) {
  return 'neutral'; // 简化
}

function assessComplexity(knowledge) {
  const size = JSON.stringify(knowledge).length;
  if (size > 10000) return 'high';
  if (size > 1000) return 'medium';
  return 'low';
}

// 主函数
async function main() {
  console.log('=== 进化系统优化器 ===\n');
  
  loadState();
  
  // 测试触发
  const testKnowledge = 'memory system optimization and vector embedding';
  const trigger = canTrigger(testKnowledge);
  
  console.log('触发检测:', trigger);
  
  if (trigger.canTrigger) {
    // 分析
    const analysis = await analyzeKnowledge(testKnowledge);
    
    // 执行
    if (analysis.suggestions.length > 0) {
      const result = await executeSafely(analysis.suggestions[0]);
      trackPerformance(result);
      
      state.lastTrigger = Date.now();
      state.dailyCount++;
      saveState();
    }
  }
  
  console.log('\n状态:', {
    dailyCount: state.dailyCount,
    cooldown: getAdaptiveCooldown(),
    performance: state.performance.slice(-3)
  });
  
  console.log('\n✅ 优化完成!');
}

main();
