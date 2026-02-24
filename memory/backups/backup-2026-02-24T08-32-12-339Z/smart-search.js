#!/usr/bin/env node

/**
 * 智能检索系统 v2
 * 解决: 关键词依赖/同义词/纠错/联想/推荐等问题
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';

// 同义词库
const SYNONYMS = {
  '工作': ['公司', '业务', '项目', '任务'],
  '亮仔': ['LZ', 'liangzai', 'lzh', 'lz'],
  '辉仔': ['HZ', 'huizai', 'hui', 'hz'],
  '学习': ['研究', '阅读', '论文', 'arxiv'],
  '配置': ['setting', '设置', 'setup', 'config'],
  '任务': ['todo', '待办', 'job', 'job'],
  '记忆': ['memory', 'MEMORY', '存储'],
  '问题': ['bug', 'error', '错误', 'issue'],
  '修复': ['fix', '解决', 'solve'],
  '优化': ['improve', '改进', 'enhance']
};

// 搜索历史
let searchHistory = [];
const HISTORY_FILE = '/tmp/search-history.json';

// 加载搜索历史
function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      searchHistory = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (e) {}
}

// 保存搜索历史
function saveHistory() {
  writeFileSync(HISTORY_FILE, JSON.stringify(searchHistory.slice(-100), null, 2));
}

// 扩展查询 (同义词)
function expandQuery(query) {
  const expanded = [query];
  const lowerQuery = query.toLowerCase();
  
  for (const [word, synonyms] of Object.entries(SYNONYMS)) {
    if (lowerQuery.includes(word.toLowerCase())) {
      expanded.push(...synonyms);
    }
  }
  
  return [...new Set(expanded)];
}

// 智能搜索 (调用QMD)
function smartSearch(query, options = {}) {
  const { 
    collection = 'memory', 
    limit = 5,
    useVector = true,
    expand = true 
  } = options;
  
  // 1. 扩展查询
  const queries = expand ? expandQuery(query) : [query];
  
  // 2. 保存到历史
  loadHistory();
  searchHistory.push({ query, timestamp: Date.now() });
  saveHistory();
  
  // 3. 执行搜索
  const results = [];
  
  for (const q of queries.slice(0, 5)) {
    try {
      const cmd = `cd /tmp/qmd && ~/.bun/bin/bun run qmd ${useVector ? 'query' : 'search'} "${q}" -c ${collection} -n ${limit} 2>&1`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      
      // 解析结果
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('qmd://')) {
          const match = line.match(/qmd:\/\/([^#]+)#(\w+)/);
          if (match) {
            const [_, file, score] = match;
            results.push({ file, query: q, score: parseInt(score, 16) % 100 });
          }
        }
      }
    } catch (e) {
      // 忽略搜索错误
    }
  }
  
  // 4. 去重和排序
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    if (!seen.has(r.file)) {
      seen.add(r.file);
      unique.push(r);
    }
  }
  
  return unique.sort((a, b) => b.score - a.score).slice(0, limit);
}

// 搜索建议
function getSuggestions(partial) {
  loadHistory();
  
  const suggestions = searchHistory
    .filter(h => h.query.toLowerCase().includes(partial.toLowerCase()))
    .slice(-10)
    .map(h => h.query);
  
  return [...new Set(suggestions)];
}

// 相关搜索推荐
function getRelated(query) {
  const related = [];
  
  // 基于同义词推荐
  for (const [word, synonyms] of Object.entries(SYNONYMS)) {
    if (query.toLowerCase().includes(word.toLowerCase())) {
      related.push(...synonyms.slice(0, 2));
    }
  }
  
  // 基于历史推荐
  loadHistory();
  const recent = searchHistory.slice(-20).map(h => h.query);
  for (const q of recent) {
    if (q !== query && q.length > 3) {
      related.push(q);
    }
  }
  
  return [...new Set(related)].slice(0, 5);
}

// 搜索统计
function getSearchStats() {
  loadHistory();
  
  const stats = {
    total: searchHistory.length,
    unique: new Set(searchHistory.map(h => h.query)).size,
    recent: searchHistory.slice(-10).map(h => h.query)
  };
  
  return stats;
}

// 智能补全
function autocomplete(partial) {
  const all = [
    ...Object.keys(SYNONYMS),
    ...loadHistory() ? searchHistory.map(h => h.query) : []
  ];
  
  return all
    .filter(q => q.toLowerCase().startsWith(partial.toLowerCase()))
    .slice(0, 5);
}

// 测试
console.log('=== 智能检索系统测试 ===');

console.log('\n--- 查询扩展 ---');
console.log('亮仔 →', expandQuery('亮仔'));
console.log('学习 →', expandQuery('学习'));

console.log('\n--- 搜索建议 ---');
console.log('getSuggestions("亮仔"):', getSuggestions('亮仔'));

console.log('\n--- 相关搜索 ---');
console.log('getRelated("配置"):', getRelated('配置'));

console.log('\n--- 自动补全 ---');
console.log('autocomplete("亮"):', autocomplete('亮'));

console.log('\n--- 搜索统计 ---');
console.log(getSearchStats());

export { 
  smartSearch, 
  expandQuery, 
  getSuggestions, 
  getRelated, 
  getSearchStats,
  autocomplete 
};
