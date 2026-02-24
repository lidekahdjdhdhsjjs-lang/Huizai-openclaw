#!/usr/bin/env node
/**
 * P1: 记忆索引模块
 * - 多级索引 (L0/L1/L2)
 * - 增量更新
 * - 索引健康检查
 * - 自动分类
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const INDEX_FILE = join(MEMORY_ROOT, 'core', '.index.json');

class IndexManager {
  constructor(config = {}) {
    this.config = {
      multiLevel: true,
      autoUpdate: true,
      updateInterval: 300000,
      categories: ['daily', 'learning', 'company', 'skills', 'config', 'project'],
      ...config
    };
    this.index = {
      L0: {},
      L1: {},
      L2: {},
      metadata: {
        lastUpdated: null,
        totalFiles: 0,
        totalChunks: 0
      }
    };
    this.watchers = new Map();
  }

  async initialize() {
    this.loadIndex();
    if (this.config.autoUpdate) {
      this.scheduleUpdate();
    }
    console.log('  ✓ 索引模块初始化完成');
  }

  loadIndex() {
    try {
      if (existsSync(INDEX_FILE)) {
        this.index = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
      }
    } catch (e) {
      console.log('    索引文件不存在，将创建新索引');
    }
  }

  saveIndex() {
    try {
      this.index.metadata.lastUpdated = new Date().toISOString();
      writeFileSync(INDEX_FILE, JSON.stringify(this.index, null, 2));
    } catch (e) {}
  }

  async index(entry) {
    const id = entry.id || this.generateId();
    
    this.index.L0[id] = {
      id,
      type: this.classify(entry),
      title: this.extractTitle(entry),
      summary: this.generateSummary(entry),
      tags: this.extractTags(entry),
      importance: entry.importance || 0.5,
      timestamp: Date.now()
    };

    this.index.L1[id] = {
      id,
      preview: (entry.content || '').substring(0, 200),
      keywords: this.extractKeywords(entry),
      relations: entry.relations || []
    };

    this.index.L2[id] = {
      id,
      fullContent: entry.content,
      raw: entry
    };

    this.index.metadata.totalFiles++;
    this.index.metadata.totalChunks++;
    this.saveIndex();

    return { ...entry, id, indexed: true };
  }

  async update(id, updates) {
    if (!this.index.L0[id]) {
      return { error: 'not_found' };
    }

    this.index.L0[id] = {
      ...this.index.L0[id],
      ...updates,
      updatedAt: Date.now()
    };

    if (updates.content) {
      this.index.L1[id].preview = updates.content.substring(0, 200);
      this.index.L1[id].keywords = this.extractKeywords(updates);
      this.index.L2[id].fullContent = updates.content;
    }

    this.saveIndex();
    return this.index.L0[id];
  }

  async delete(id) {
    delete this.index.L0[id];
    delete this.index.L1[id];
    delete this.index.L2[id];
    this.index.metadata.totalFiles--;
    this.saveIndex();
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  classify(entry) {
    const content = (entry.content || '').toLowerCase();
    const path = entry.path || '';

    if (path.includes('待办') || content.includes('待办')) return 'todo';
    if (path.includes('偏好') || content.includes('偏好')) return 'preference';
    if (path.includes('知识库') || content.includes('学习')) return 'learning';
    if (path.includes('evolution') || content.includes('进化')) return 'evolution';
    if (path.includes('company') || content.includes('公司')) return 'company';
    if (/202\d-\d{2}-\d{2}/.test(path)) return 'daily';
    if (content.includes('配置') || content.includes('config')) return 'config';

    return 'general';
  }

  extractTitle(entry) {
    const content = entry.content || '';
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    return content.substring(0, 50) + '...';
  }

  generateSummary(entry) {
    const content = entry.content || '';
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    
    if (sentences.length > 0) {
      return sentences.slice(0, 2).join(' ').substring(0, 100);
    }
    
    return content.substring(0, 100);
  }

  extractTags(entry) {
    const tags = entry.tags || [];
    const content = entry.content || '';
    
    const tagPatterns = [
      /\b(discord|whatsapp|telegram|slack)\b/gi,
      /\b(配置|config|token|api)\b/gi,
      /\b(cron|定时|自动化)\b/gi,
      /\b(亮仔|辉仔|康仔)\b/g
    ];

    for (const pattern of tagPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.map(m => m.toLowerCase()));
      }
    }

    return [...new Set(tags)];
  }

  extractKeywords(entry) {
    const content = entry.content || '';
    const words = content.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
    
    const wordCount = {};
    for (const word of words) {
      if (word.length >= 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    }

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  scheduleUpdate() {
    setInterval(() => this.rebuildIndex(), this.config.updateInterval);
  }

  async rebuildIndex() {
    console.log('    重建索引...');
    const startTime = Date.now();
    
    const files = this.scanFiles(join(MEMORY_ROOT));
    let processed = 0;

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        await this.index({
          id: this.generateId(),
          content,
          path: file,
          indexedAt: new Date().toISOString()
        });
        processed++;
      } catch (e) {}
    }

    const duration = Date.now() - startTime;
    console.log(`    索引重建完成: ${processed} 文件, ${duration}ms`);
  }

  scanFiles(dir) {
    const files = [];
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          files.push(...this.scanFiles(fullPath));
        } else if (stat.isFile() && entry.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (e) {}
    return files;
  }

  async search(query, options = {}) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [id, entry] of Object.entries(this.index.L0)) {
      const score = this.calculateScore(entry, lowerQuery, this.index.L1[id]);
      if (score > 0) {
        results.push({
          ...entry,
          L1: this.index.L1[id],
          score
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, options.limit || 20);
  }

  calculateScore(entry, query, L1Entry) {
    let score = 0;
    
    if (entry.title.toLowerCase().includes(query)) score += 3;
    if (entry.summary.toLowerCase().includes(query)) score += 2;
    
    for (const tag of entry.tags) {
      if (tag.includes(query)) score += 1;
    }
    
    if (L1Entry && L1Entry.keywords) {
      for (const kw of L1Entry.keywords) {
        if (kw.toLowerCase().includes(query)) score += 0.5;
      }
    }

    return score;
  }

  async healthCheck() {
    const issues = [];
    
    const L0Count = Object.keys(this.index.L0).length;
    const L1Count = Object.keys(this.index.L1).length;
    const L2Count = Object.keys(this.index.L2).length;

    if (L0Count !== L1Count || L0Count !== L2Count) {
      issues.push({
        severity: 'warning',
        message: '索引层级不一致',
        details: { L0: L0Count, L1: L1Count, L2: L2Count }
      });
    }

    const lastUpdated = this.index.metadata.lastUpdated;
    if (lastUpdated) {
      const age = Date.now() - new Date(lastUpdated).getTime();
      if (age > 86400000) {
        issues.push({
          severity: 'info',
          message: '索引超过24小时未更新',
          lastUpdated
        });
      }
    }

    return {
      healthy: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      stats: {
        L0Count,
        L1Count,
        L2Count,
        lastUpdated
      }
    };
  }

  async getStatus() {
    return {
      multiLevel: this.config.multiLevel,
      autoUpdate: this.config.autoUpdate,
      updateInterval: this.config.updateInterval,
      metadata: this.index.metadata,
      healthCheck: await this.healthCheck()
    };
  }
}

export { IndexManager };
export default IndexManager;
