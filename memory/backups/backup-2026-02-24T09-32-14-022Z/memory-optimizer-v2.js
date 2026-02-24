#!/usr/bin/env node

/**
 * 记忆系统全面优化器 v2
 * 实现分层存储、版本控制、标签系统
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = '/home/li/.openclaw/workspace/memory';
const LAYERS = {
  L0: path.join(MEMORY_DIR, '索引'),
  L1: path.join(MEMORY_DIR, '摘要'),
  L2: path.join(MEMORY_DIR, '原始数据')
};

// 确保目录结构
function ensureStructure() {
  for (const [name, dir] of Object.entries(LAYERS)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ 创建 ${name}: ${dir}`);
    }
  }
}

// 1. 分层存储
function organizeByLayers() {
  console.log('🏗️ 分层存储...');
  
  const files = getAllMdFiles(MEMORY_DIR);
  let organized = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const importance = calculateImportance(content);
    
    let targetDir;
    if (importance >= 7) {
      targetDir = LAYERS.L0; // 高价值
    } else if (importance >= 4) {
      targetDir = LAYERS.L1; // 中价值
    } else {
      targetDir = LAYERS.L2; // 低价值
    }
    
    const fileName = path.basename(file);
    const targetPath = path.join(targetDir, fileName);
    
    if (file !== targetPath && !fs.existsSync(targetPath)) {
      fs.copyFileSync(file, targetPath);
      organized++;
    }
  }
  
  console.log(`  ✅ 整理了 ${organized} 个文件`);
}

// 2. 重要性评分
function calculateImportance(content) {
  const highKeywords = ['重要', '关键', '决定', '配置', 'password', 'token', 'critical'];
  const lowKeywords = ['好的', '收到', 'OK', 'thanks'];
  
  let score = 5;
  const lower = content.toLowerCase();
  
  for (const kw of highKeywords) {
    if (lower.includes(kw)) score += 2;
  }
  for (const kw of lowKeywords) {
    if (lower.includes(kw)) score -= 2;
  }
  
  // 长度加分
  if (content.length > 500) score += 1;
  if (content.length > 1000) score += 1;
  
  return Math.max(1, Math.min(10, score));
}

// 3. 版本控制
const versions = new Map();

function saveVersion(file, content) {
  const key = path.basename(file);
  if (!versions.has(key)) versions.set(key, []);
  
  versions.get(key).push({
    timestamp: Date.now(),
    content,
    hash: hashContent(content)
  });
  
  // 保留10个版本
  if (versions.get(key).length > 10) {
    versions.get(key).shift();
  }
}

function hashContent(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// 4. 标签系统
function extractTags(content) {
  const tags = new Set();
  const tagPattern = /#(\w+)/g;
  let match;
  
  while ((match = tagPattern.exec(content)) !== null) {
    tags.add(match[1]);
  }
  
  // 自动提取
  const autoTags = {
    '配置': ['config', 'setting'],
    '密码': ['password', 'token', 'secret'],
    '代码': ['code', 'function', 'class'],
    '学习': ['learn', 'study', 'paper'],
    '任务': ['todo', 'task', 'job']
  };
  
  const lower = content.toLowerCase();
  for (const [tag, keywords] of Object.entries(autoTags)) {
    if (keywords.some(k => lower.includes(k))) {
      tags.add(tag);
    }
  }
  
  return [...tags];
}

// 5. 关联图
const relations = new Map();

function addRelation(from, to, type = 'related') {
  if (!relations.has(from)) relations.set(from, []);
  relations.get(from).push({ to, type, timestamp: Date.now() });
}

// 6. 记忆验证
function validateMemory(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const issues = [];
  
  // 检查空内容
  if (content.trim().length < 10) {
    issues.push('内容过短');
  }
  
  // 检查编码
  try {
    content.encodeURI();
  } catch {
    issues.push('编码问题');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// 7. 摘要生成 (简化版)
function generateSummary(content, maxLen = 200) {
  if (content.length <= maxLen) return content;
  
  // 取前200字符 + ...
  return content.substring(0, maxLen) + '...';
}

// 8. 记忆统计
function getStats() {
  const stats = {
    total: 0,
    byLayer: { L0: 0, L1: 0, L2: 0 },
    totalSize: 0,
    tags: new Set(),
    versions: versions.size
  };
  
  for (const [layer, dir] of Object.entries(LAYERS)) {
    if (fs.existsSync(dir)) {
      const files = getAllMdFiles(dir);
      stats.byLayer[layer] = files.length;
      stats.total += files.length;
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        stats.totalSize += content.length;
        
        for (const tag of extractTags(content)) {
          stats.tags.add(tag);
        }
      }
    }
  }
  
  return {
    ...stats,
    tags: [...stats.tags]
  };
}

// 工具函数
function getAllMdFiles(dir) {
  const files = [];
  
  function walk(d) {
    const entries = fs.readdirSync(d);
    for (const entry of entries) {
      const fullPath = path.join(d, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.')) {
        walk(fullPath);
      } else if (entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// 主函数
function main() {
  console.log('=== 记忆系统全面优化 v2 ===\n');
  
  // 创建结构
  console.log('1. 确保目录结构...');
  ensureStructure();
  
  // 分层存储
  console.log('\n2. 分层存储...');
  organizeByLayers();
  
  // 统计
  console.log('\n3. 统计信息...');
  const stats = getStats();
  console.log(`   总文件: ${stats.total}`);
  console.log(`   L0(高价值): ${stats.byLayer.L0}`);
  console.log(`   L1(中价值): ${stats.byLayer.L1}`);
  console.log(`   L2(低价值): ${stats.byLayer.L2}`);
  console.log(`   总大小: ${(stats.totalSize / 1024).toFixed(1)}KB`);
  console.log(`   标签: ${stats.tags.slice(0, 5).join(', ')}...`);
  console.log(`   版本: ${stats.versions}`);
  
  console.log('\n✅ 优化完成!');
}

main();
