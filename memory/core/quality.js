#!/usr/bin/env node
/**
 * P1: 记忆质量模块
 * - 重要性评分
 * - 置信度追踪
 * - 去重检测
 * - 内容验证
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const QUALITY_FILE = join(MEMORY_ROOT, 'core', '.quality.json');

class QualityManager {
  constructor(config = {}) {
    this.config = {
      importanceThreshold: 0.3,
      confidenceTracking: true,
      deduplication: true,
      dedupThreshold: 0.85,
      verificationEnabled: true,
      ...config
    };
    this.contentHashes = new Map();
    this.importanceKeywords = {
      high: ['token', '密码', '配置', 'key', 'api', '决策', '重要', '紧急', 'remember', '记住', '记住这个'],
      medium: ['任务', '计划', '学习', '技能', 'cron', '待办', 'project', '项目'],
      low: ['你好', '收到', 'ok', '好的', '嗯', 'hello', 'hi', 'bye']
    };
    this.decisionPatterns = [/决定|选择|方案|采用|确认|确定/i, /decided|chosen|selected/i];
    this.questionPatterns = [/如何|怎么|为什么|what|how|why|\?/i];
    this.qualityStats = {
      evaluated: 0,
      filtered: 0,
      deduplicated: 0,
      verified: 0
    };
  }

  async initialize() {
    this.loadQualityData();
    console.log('  ✓ 质量模块初始化完成');
  }

  loadQualityData() {
    try {
      if (existsSync(QUALITY_FILE)) {
        const data = JSON.parse(readFileSync(QUALITY_FILE, 'utf-8'));
        if (data.contentHashes) {
          this.contentHashes = new Map(Object.entries(data.contentHashes));
        }
        this.qualityStats = { ...this.qualityStats, ...data.stats };
      }
    } catch (e) {}
  }

  saveQualityData() {
    try {
      const data = {
        contentHashes: Object.fromEntries(this.contentHashes),
        stats: this.qualityStats,
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(QUALITY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
  }

  evaluateImportance(content) {
    if (!content) return 0;
    
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const lower = text.toLowerCase();
    let score = 5;

    for (const kw of this.importanceKeywords.high) {
      if (lower.includes(kw.toLowerCase())) {
        score += 2;
        break;
      }
    }

    for (const kw of this.importanceKeywords.medium) {
      if (lower.includes(kw.toLowerCase())) {
        score += 1;
        break;
      }
    }

    for (const kw of this.importanceKeywords.low) {
      if (lower === kw.toLowerCase() || text.length < 10) {
        score -= 3;
        break;
      }
    }

    if (text.length > 500) score += 1;
    if (text.length > 1000) score += 1;

    for (const pattern of this.decisionPatterns) {
      if (pattern.test(text)) {
        score += 2;
        break;
      }
    }

    for (const pattern of this.questionPatterns) {
      if (pattern.test(text)) {
        score += 1;
        break;
      }
    }

    return Math.max(1, Math.min(10, score)) / 10;
  }

  evaluateConfidence(entry) {
    if (!this.config.confidenceTracking) return 1;
    
    let confidence = 1;
    
    if (entry.source === 'user_direct') confidence = 1;
    else if (entry.source === 'inferred') confidence = 0.7;
    else if (entry.source === 'external') confidence = 0.8;
    
    if (entry.verifications && entry.verifications > 0) {
      confidence = Math.min(1, confidence + 0.1 * entry.verifications);
    }
    
    if (entry.contradictions && entry.contradictions > 0) {
      confidence = Math.max(0.1, confidence - 0.2 * entry.contradictions);
    }
    
    return confidence;
  }

  async evaluate(entry) {
    this.qualityStats.evaluated++;
    
    const content = entry.content || entry;
    const importance = this.evaluateImportance(content);
    
    if (importance < this.config.importanceThreshold) {
      this.qualityStats.filtered++;
      this.saveQualityData();
      return { ...entry, importance, filtered: true, filterReason: 'low_importance' };
    }

    if (this.config.deduplication) {
      const duplicate = await this.checkDuplicate(content);
      if (duplicate) {
        this.qualityStats.deduplicated++;
        this.saveQualityData();
        return { 
          ...entry, 
          importance, 
          duplicate: true, 
          duplicateOf: duplicate,
          confidence: this.evaluateConfidence(entry)
        };
      }
    }

    const result = {
      ...entry,
      importance,
      confidence: this.evaluateConfidence(entry),
      evaluatedAt: new Date().toISOString(),
      contentHash: this.hashContent(content)
    };

    if (this.config.verificationEnabled) {
      result.verificationStatus = 'pending';
    }

    this.contentHashes.set(result.contentHash, {
      id: entry.id,
      timestamp: Date.now()
    });
    
    this.saveQualityData();
    return result;
  }

  hashContent(content) {
    const normalized = (typeof content === 'string' ? content : JSON.stringify(content))
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return createHash('md5').update(normalized).digest('hex');
  }

  async checkDuplicate(content) {
    const hash = this.hashContent(content);
    const existing = this.contentHashes.get(hash);
    
    if (existing) {
      return existing.id;
    }

    const similar = await this.findSimilar(content, this.config.dedupThreshold);
    return similar;
  }

  async findSimilar(content, threshold) {
    return null;
  }

  async verify(entryId, verified = true) {
    this.qualityStats.verified++;
    this.saveQualityData();
    return { id: entryId, verificationStatus: verified ? 'verified' : 'rejected' };
  }

  async reportContradiction(entryId, contradictionId) {
    return {
      entryId,
      contradictionId,
      reportedAt: new Date().toISOString()
    };
  }

  getImportanceDistribution() {
    return {
      high: Array.from(this.contentHashes.values()).filter(e => e.importance > 0.7).length,
      medium: Array.from(this.contentHashes.values()).filter(e => e.importance >= 0.3 && e.importance <= 0.7).length,
      low: Array.from(this.contentHashes.values()).filter(e => e.importance < 0.3).length
    };
  }

  async getStatus() {
    return {
      importanceThreshold: this.config.importanceThreshold,
      confidenceTracking: this.config.confidenceTracking,
      deduplication: this.config.deduplication,
      dedupThreshold: this.config.dedupThreshold,
      stats: this.qualityStats,
      contentHashesCount: this.contentHashes.size
    };
  }
}

export { QualityManager };
export default QualityManager;
