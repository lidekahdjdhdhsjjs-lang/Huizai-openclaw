#!/usr/bin/env node

/**
 * 记忆系统优化器 v1
 * 实现: 增量索引、自动压缩、智能缓存
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEMORY_DIR = '/home/li/.openclaw/workspace/memory';
const CACHE_DIR = '/tmp/memory-cache';
const CONFIG = {
  maxFileAge: 30 * 24 * 60 * 60 * 1000, // 30天
  compressThreshold: 100 * 1024, // 100KB
  cacheSize: 1000,
  incrementalInterval: 60 * 60 * 1000 // 1小时
};

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. 增量索引
function incrementalIndex() {
  console.log('🔄 增量索引...');
  const files = getMarkdownFiles(MEMORY_DIR);
  const indexFile = path.join(CACHE_DIR, 'file-index.json');
  
  let existingIndex = {};
  try {
    existingIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  } catch {}
  
  const newFiles = [];
  for (const file of files) {
    const stats = fs.statSync(file);
    const mtime = stats.mtimeMs;
    
    if (!existingIndex[file] || existingIndex[file] < mtime) {
      newFiles.push(file);
      existingIndex[file] = mtime;
    }
  }
  
  if (newFiles.length > 0) {
    fs.writeFileSync(indexFile, JSON.stringify(existingIndex, null, 2));
    console.log(`  ✅ ${newFiles.length} 个新/更新文件`);
    return newFiles;
  }
  
  console.log('  ✓ 无新文件');
  return [];
}

// 2. 自动压缩旧文件
function compressOldFiles() {
  console.log('📦 压缩旧文件...');
  const files = getMarkdownFiles(MEMORY_DIR);
  let compressed = 0;
  
  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.size > CONFIG.compressThreshold) {
      const age = Date.now() - stats.mtimeMs;
      if (age > CONFIG.maxFileAge) {
        // 压缩内容（简化处理：删除冗余空白）
        let content = fs.readFileSync(file, 'utf-8');
        const originalSize = content.length;
        content = content.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ');
        
        if (content.length < originalSize) {
          fs.writeFileSync(file, content);
          compressed++;
        }
      }
    }
  }
  
  console.log(`  ✅ 压缩了 ${compressed} 个文件`);
  return compressed;
}

// 3. 智能缓存
const searchCache = new Map();

function getCachedSearch(query) {
  return searchCache.get(query);
}

function setCacheSearch(query, results) {
  if (searchCache.size >= CONFIG.cacheSize) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(query, {
    results,
    timestamp: Date.now()
  });
}

// 4. 自动清理
function autoCleanup() {
  console.log('🧹 自动清理...');
  const logDir = path.join(MEMORY_DIR, 'logs');
  
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    let deleted = 0;
    
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;
      
      if (age > CONFIG.maxFileAge) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
    
    console.log(`  ✅ 删除了 ${deleted} 个旧日志`);
  }
}

// 5. 备份优化
function optimizeBackup() {
  console.log('💾 优化备份...');
  const backupDir = path.join(MEMORY_DIR, 'backups');
  
  if (fs.existsSync(backupDir)) {
    const dirs = fs.readdirSync(backupDir)
      .filter(f => fs.statSync(path.join(backupDir, f)).isDirectory())
      .sort()
      .reverse();
    
    // 保留最近的10个
    const toDelete = dirs.slice(10);
    for (const dir of toDelete) {
      fs.rmSync(path.join(backupDir, dir), { recursive: true });
    }
    
    console.log(`  ✅ 清理了 ${toDelete.length} 个旧备份`);
  }
}

// 6. 搜索优化
function optimizeSearch() {
  console.log('🔍 优化搜索...');
  
  // 预热缓存
  const recentFiles = getMarkdownFiles(MEMORY_DIR).slice(0, 10);
  for (const file of recentFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const keywords = extractKeywords(content);
    
    for (const kw of keywords) {
      const cached = searchCache.get(kw) || [];
      if (!cached.includes(file)) {
        cached.push(file);
        searchCache.set(kw, cached);
      }
    }
  }
  
  console.log(`  ✅ 缓存了 ${searchCache.size} 个关键词`);
}

// 工具函数
function getMarkdownFiles(dir) {
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

function extractKeywords(content) {
  const words = content.toLowerCase().split(/\W+/);
  const freq = {};
  for (const w of words) {
    if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
}

// 主函数
function main() {
  console.log('=== 记忆系统优化器 ===\n');
  
  ensureDir(CACHE_DIR);
  
  incrementalIndex();
  compressOldFiles();
  autoCleanup();
  optimizeBackup();
  optimizeSearch();
  
  console.log('\n✅ 优化完成!');
}

main();
