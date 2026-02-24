#!/usr/bin/env node

/**
 * 智能记忆系统 - 重要性评估模块
 * 功能: 自动评估信息重要性,过滤低价值内容
 */

const IMPORTANCE_KEYWORDS = {
  high: ['token', '密码', '配置', 'key', 'api', '决策', '重要', '紧急'],
  medium: ['任务', '计划', '学习', '技能', 'cron', '待办'],
  low: ['你好', '收到', 'ok', '好的', '嗯']
};

function evaluateImportance(text, context = {}) {
  let score = 5; // 基础分 5/10
  
  const lowerText = text.toLowerCase();
  
  // 高价值关键词 (加2分)
  for (const kw of IMPORTANCE_KEYWORDS.high) {
    if (lowerText.includes(kw)) {
      score += 2;
      break;
    }
  }
  
  // 中价值关键词 (加1分)
  for (const kw of IMPORTANCE_KEYWORDS.medium) {
    if (lowerText.includes(kw)) {
      score += 1;
      break;
    }
  }
  
  // 低价值过滤 (减2分)
  for (const kw of IMPORTANCE_KEYWORDS.low) {
    if (lowerText === kw || lowerText.length < 10) {
      score -= 2;
      break;
    }
  }
  
  // 长度加分 (长内容更有价值)
  if (text.length > 500) score += 1;
  if (text.length > 1000) score += 1;
  
  // 时间衰减
  if (context.age) {
    const days = (Date.now() - context.age) / (1000 * 60 * 60 * 24);
    score *= Math.max(0.3, 1 - days / 365);
  }
  
  // 决策类加分
  if (/决定|选择|方案|采用/i.test(text)) score += 2;
  
  // 问题类加分
  if (/如何|怎么|为什么|?/.test(text)) score += 1;
  
  return Math.max(1, Math.min(10, score));
}

function shouldRemember(text, threshold = 5) {
  return evaluateImportance(text) >= threshold;
}

// 测试
const testCases = [
  'Discord Token配置完成',
  '好的',
  '记住我的偏好是专业简洁',
  'cron任务error了',
  '今天天气不错'
];

console.log('=== 重要性评估测试 ===');
for (const text of testCases) {
  const score = evaluateImportance(text);
  const result = shouldRemember(text) ? '✅ 记住' : '❌ 忘记';
  console.log(`${score.toFixed(2)} - ${text}: ${result}`);
}

module.exports = { evaluateImportance, shouldRemember };
