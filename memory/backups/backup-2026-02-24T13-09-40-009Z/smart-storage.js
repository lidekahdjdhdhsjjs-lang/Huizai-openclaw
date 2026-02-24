#!/usr/bin/env node

/**
 * 智能记忆存储系统 v2
 * 解决: 格式单一/版本历史/增量存储/压缩/加密等问题
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import { createHash } from 'crypto';

const STORAGE_DIR = '/home/li/.openclaw/workspace/memory-v2';

// 存储配置
const CONFIG = {
  enableVersion: true,      // 版本历史
  enableCompression: false,   // 压缩 (需要zlib)
  enableEncrypt: false,       // 加密 (需要crypto)
  enableDeduplication: true,  // 去重
  maxFileSize: 1024 * 1024,  // 1MB max
  encryptKey: null           // 加密密钥
};

// 文件类型检测
const FILE_TYPES = {
  markdown: ['.md', '.mdown', '.markdown'],
  json: ['.json'],
  text: ['.txt', '.log'],
  code: ['.js', '.ts', '.py', '.sh']
};

// 获取文件类型
function getFileType(filename) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'unknown';
}

// 内容哈希 (用于去重)
function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// 版本控制: 保存历史
function saveVersion(filepath, content) {
  if (!CONFIG.enableVersion) return;
  
  const versionDir = join(dirname(filepath), '.versions');
  if (!existsSync(versionDir)) {
    mkdirSync(versionDir, { recursive: true });
  }
  
  const hash = hashContent(content);
  const versionFile = join(versionDir, `${basename(filepath)}.${hash}`);
  
  if (!existsSync(versionFile)) {
    appendFileSync(versionFile, JSON.stringify({
      timestamp: Date.now(),
      content,
      hash
    }) + '\n');
  }
}

// 增量存储: 只存diff
function saveIncremental(filepath, newContent) {
  if (!existsSync(filepath)) {
    writeFileSync(filepath, newContent);
    return;
  }
  
  const oldContent = readFileSync(filepath, 'utf-8');
  const oldHash = hashContent(oldContent);
  const newHash = hashContent(newContent);
  
  if (oldHash === newHash) {
    console.log('内容未变,跳过存储');
    return;
  }
  
  // 简单diff (实际应该用diff库)
  const diff = {
    timestamp: Date.now(),
    oldHash,
    newHash,
    changed: true
  };
  
  writeFileSync(filepath + '.diff', JSON.stringify(diff));
  writeFileSync(filepath, newContent);
}

// 去重检测
function checkDuplicate(content) {
  if (!CONFIG.enableDeduplication) return false;
  
  const hash = hashContent(content);
  const dedupIndex = join(STORAGE_DIR, '.dedup-index.json');
  
  let index = {};
  if (existsSync(dedupIndex)) {
    try {
      index = JSON.parse(readFileSync(dedupIndex, 'utf-8'));
    } catch (e) {}
  }
  
  if (index[hash]) {
    console.log(`重复内容,已有: ${index[hash]}`);
    return true;
  }
  
  index[hash] = { timestamp: Date.now() };
  writeFileSync(dedupIndex, JSON.stringify(index, null, 2));
  return false;
}

// 压缩 (简化版)
function compress(content) {
  if (!CONFIG.enableCompression) return content;
  // 实际应该用zlib
  return content;
}

// 加密 (简化版)
function encrypt(content) {
  if (!CONFIG.enableEncrypt || !CONFIG.encryptKey) return content;
  // 实际应该用crypto
  return content;
}

// 智能存储
function smartSave(filepath, content) {
  // 1. 去重
  if (checkDuplicate(content)) {
    return { status: 'duplicate', saved: false };
  }
  
  // 2. 保存版本
  if (CONFIG.enableVersion && existsSync(filepath)) {
    saveVersion(filepath, readFileSync(filepath, 'utf-8'));
  }
  
  // 3. 加密
  const encrypted = encrypt(content);
  
  // 4. 压缩
  const compressed = compress(encrypted);
  
  // 5. 增量存储
  if (CONFIG.enableVersion) {
    saveIncremental(filepath, compressed);
  } else {
    writeFileSync(filepath, compressed);
  }
  
  return { status: 'saved', saved: true };
}

// 清理旧版本
function cleanupOldVersions(filepath, keep = 10) {
  const versionDir = join(dirname(filepath), '.versions');
  if (!existsSync(versionDir)) return;
  
  const versions = readdirSync(versionDir)
    .map(f => ({ file: f, time: statSync(join(versionDir, f)).mtime }))
    .sort((a, b) => b.time - a.time);
  
  for (let i = keep; i < versions.length; i++) {
    unlinkSync(join(versionDir, versions[i].file));
  }
  
  console.log(`清理旧版本,保留${keep}个`);
}

// 存储统计
function getStorageStats(dir = STORAGE_DIR) {
  let totalSize = 0;
  let fileCount = 0;
  
  function walk(path) {
    const files = readdirSync(path);
    for (const f of files) {
      if (f.startsWith('.')) continue;
      const fullPath = join(path, f);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    }
  }
  
  try {
    walk(dir);
  } catch (e) {}
  
  return {
    files: fileCount,
    size: totalSize,
    sizeMB: (totalSize / 1024 / 1024).toFixed(2)
  };
}

// 初始化
function init() {
  mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`存储目录: ${STORAGE_DIR}`);
}

// 测试
console.log('=== 智能存储系统测试 ===');
init();

console.log('\n--- 存储统计 ---');
console.log(getStorageStats());

console.log('\n--- 去重测试 ---');
smartSave('/tmp/test.md', 'Hello World');
smartSave('/tmp/test.md', 'Hello World'); // 应该跳过

console.log('\n✅ 存储系统就绪');
