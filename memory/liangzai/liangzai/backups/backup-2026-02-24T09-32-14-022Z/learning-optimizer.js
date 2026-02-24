#!/usr/bin/env node

/**
 * 学习系统优化器 (Foundry) v1
 * 实现: 实时收集、智能结晶、多维评估
 */

const fs = require('fs');

const INSIGHTS_DIR = '/tmp/foundry-insights';
const PATTERNS_FILE = '/tmp/foundry-patterns.json';
const CONFIG = {
  // 收集
  collection: {
    realtime: true,
    dedup: true,
    maxPerHour: 100
  },
  // 结晶
  crystallization: {
    minOccurrences: 3,
    minConfidence: 0.6,
    parallel: true
  },
  // 应用
  application: {
    cacheEnabled: true,
    semanticMatch: true,
    maxSuggestions: 5
  }
};

let patterns = [];
let insights = [];
let cache = new Map();

function loadData() {
  try {
    patterns = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf-8'));
  } catch {
    patterns = [];
  }
  
  try {
    insights = JSON.parse(fs.readFileSync(path.join(INSIGHTS_DIR, 'latest.json'), 'utf-8'));
  } catch {
    insights = [];
  }
}

function saveData() {
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
}

// 1. 实时收集
function collectInsight(error, context) {
  const insight = {
    id: `insight-${Date.now()}`,
    error: error.type || 'unknown',
    message: error.message || '',
    context: context || {},
    timestamp: Date.now(),
    source: 'auto'
  };
  
  // 去重
  if (CONFIG.collection.dedup) {
    const exists = insights.some(i => 
      i.error === insight.error && 
      Math.abs(i.timestamp - insight.timestamp) < 60000
    );
    
    if (exists) return null;
  }
  
  insights.push(insight);
  
  // 限制数量
  if (insights.length > CONFIG.collection.maxPerHour) {
    insights = insights.slice(-CONFIG.collection.maxPerHour);
  }
  
  return insight;
}

// 2. 智能结晶
function crystallize(insights) {
  const grouped = {};
  
  // 按错误类型分组
  for (const insight of insights) {
    const key = insight.error;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(insight);
  }
  
  const newPatterns = [];
  
  for (const [error, items] of Object.entries(grouped)) {
    if (items.length >= CONFIG.crystallization.minOccurrences) {
      // 计算置信度
      const confidence = Math.min(1, items.length / 10);
      
      if (confidence >= CONFIG.crystallization.minConfidence) {
        const pattern = {
          id: `pattern-${Date.now()}`,
          error,
          occurrences: items.length,
          confidence,
          resolution: extractResolution(items),
          created: Date.now()
        };
        
        newPatterns.push(pattern);
      }
    }
  }
  
  return newPatterns;
}

// 3. 模式匹配应用
function matchPattern(error) {
  // 精确匹配
  let matches = patterns.filter(p => p.error === error);
  
  // 语义匹配
  if (CONFIG.application.semanticMatch && matches.length === 0) {
    const errorWords = error.toLowerCase().split(/[\s:_]/);
    
    for (const p of patterns) {
      const patternWords = p.error.toLowerCase().split(/[\s:_]/);
      const overlap = errorWords.filter(w => patternWords.includes(w));
      
      if (overlap.length >= 2) {
        matches.push(p);
      }
    }
  }
  
  return matches.slice(0, CONFIG.application.maxSuggestions);
}

// 4. 缓存优化
function getCachedSuggestion(error) {
  if (!CONFIG.application.cacheEnabled) return null;
  return cache.get(error);
}

function setCacheSuggestion(error, suggestions) {
  if (!CONFIG.application.cacheEnabled) return;
  
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(error, {
    suggestions,
    timestamp: Date.now()
  });
}

// 5. 性能统计
function getStats() {
  return {
    totalInsights: insights.length,
    totalPatterns: patterns.length,
    cacheSize: cache.size,
    insightsPerHour: insights.filter(i => 
      Date.now() - i.timestamp < 3600000
    ).length
  };
}

// 工具函数
function extractResolution(insights) {
  // 从历史解决方案中提取
  return insights[0]?.context?.resolution || 'retry';
}

// 主函数
function main() {
  console.log('=== 学习系统优化器 (Foundry) ===\n');
  
  loadData();
  
  // 模拟收集
  console.log('📥 收集洞察...');
  const testErrors = [
    { type: 'exec-timeout', message: 'Command timed out' },
    { type: 'exec-timeout', message: 'Timeout after 30s' },
    { type: 'exec-timeout', message: 'SIGTERM received' },
    { type: 'read-enoent', message: 'File not found' }
  ];
  
  for (const err of testErrors) {
    collectInsight(err, { resolution: 'retry' });
  }
  
  console.log(`  ✅ 收集了 ${testErrors.length} 个新洞察`);
  
  // 结晶
  console.log('\n💎 模式结晶...');
  const newPatterns = crystallize(insights);
  patterns.push(...newPatterns);
  saveData();
  console.log(`  ✅ 生成了 ${newPatterns.length} 个新模式`);
  
  // 应用测试
  console.log('\n🔍 模式匹配测试...');
  const matches = matchPattern('exec-timeout');
  console.log(`  ✅ 匹配到 ${matches.length} 个模式`);
  
  // 统计
  console.log('\n📊 统计:');
  console.log(getStats());
  
  console.log('\n✅ 优化完成!');
}

main();

const path = require('path');
