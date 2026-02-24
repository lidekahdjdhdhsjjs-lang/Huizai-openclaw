#!/usr/bin/env node
/**
 * OpenClaw 记忆系统核心管理器
 * 统一入口 - 整合所有记忆功能模块
 */

import { SecurityManager } from './security.js';
import { PerformanceManager } from './performance.js';
import { QualityManager } from './quality.js';
import { IndexManager } from './indexer.js';
import { RetrievalManager } from './retrieval.js';
import { LifecycleManager } from './lifecycle.js';
import { AutomationManager } from './automation.js';
import { IntegrationManager } from './integration.js';
import { existsSync, readFileSync } from 'fs';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const CONFIG_PATH = `${MEMORY_ROOT}/config/memory-config.json`;

class MemoryManager {
  constructor() {
    this.config = this.loadConfig();
    this.initialized = false;
    this.security = null;
    this.performance = null;
    this.quality = null;
    this.indexer = null;
    this.retrieval = null;
    this.lifecycle = null;
    this.automation = null;
    this.integration = null;
  }

  loadConfig() {
    try {
      if (existsSync(CONFIG_PATH)) {
        return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      }
    } catch (e) {}
    return this.getDefaultConfig();
  }

  async initialize() {
    if (this.initialized) return;
    
    this.security = new SecurityManager(this.config.security);
    this.performance = new PerformanceManager(this.config.performance);
    this.quality = new QualityManager(this.config.quality);
    this.indexer = new IndexManager(this.config.indexer);
    this.retrieval = new RetrievalManager(this.config.retrieval);
    this.lifecycle = new LifecycleManager(this.config.lifecycle);
    this.automation = new AutomationManager(this.config.automation);
    this.integration = new IntegrationManager(this.config.integration);
    
    console.log('🧠 初始化记忆系统...');
    await this.security.initialize();
    await this.performance.initialize();
    await this.quality.initialize();
    await this.indexer.initialize();
    await this.retrieval.initialize();
    await this.lifecycle.initialize();
    await this.automation.initialize();
    await this.integration.initialize();
    this.initialized = true;
    console.log('✅ 记忆系统初始化完成');
  }

  getDefaultConfig() {
    return {
      security: {
        enabled: true,
        sensitivePatterns: ['token', 'password', 'secret', 'key', 'api'],
        encryptionEnabled: false,
        auditLog: true
      },
      performance: {
        cacheEnabled: true,
        cacheMaxSize: 1000,
        lazyLoad: true,
        preloadHot: true,
        gpuAcceleration: false
      },
      quality: {
        importanceThreshold: 0.3,
        confidenceTracking: true,
        deduplication: true,
        dedupThreshold: 0.85
      },
      indexer: {
        multiLevel: true,
        autoUpdate: true,
        updateInterval: 300000
      },
      retrieval: {
        hybridSearch: true,
        vectorWeight: 0.6,
        textWeight: 0.4,
        mmrLambda: 0.7,
        temporalDecayHalfLife: 60
      },
      lifecycle: {
        p0Retention: 'permanent',
        p1RetentionDays: 90,
        p2RetentionDays: 30,
        autoArchive: true,
        forgettingCurve: true
      },
      automation: {
        autoWrite: true,
        autoUpdate: true,
        autoLink: true,
        autoClassify: true
      },
      integration: {
        foundrySync: true,
        sessionSync: true,
        hooksEnabled: true
      }
    };
  }

  async write(entry) {
    const secured = await this.security.sanitize(entry);
    const qualified = await this.quality.evaluate(secured);
    if (qualified.importance < this.config.quality.importanceThreshold) {
      return { status: 'filtered', reason: 'low_importance' };
    }
    const indexed = await this.indexer.index(qualified);
    await this.performance.cache(indexed);
    return indexed;
  }

  async search(query, options = {}) {
    const startTime = Date.now();
    const cached = await this.performance.checkCache(query);
    if (cached) return { ...cached, fromCache: true };
    
    const results = await this.retrieval.search(query, options);
    const duration = Date.now() - startTime;
    await this.performance.recordMetrics({ query, duration, resultCount: results.length });
    
    return results;
  }

  async update(id, updates) {
    const secured = await this.security.sanitize(updates);
    const updated = await this.indexer.update(id, secured);
    await this.performance.invalidateCache(id);
    return updated;
  }

  async delete(id) {
    await this.indexer.delete(id);
    await this.performance.invalidateCache(id);
    await this.lifecycle.archive(id);
  }

  async getStatus() {
    return {
      security: await this.security.getStatus(),
      performance: await this.performance.getStatus(),
      quality: await this.quality.getStatus(),
      indexer: await this.indexer.getStatus(),
      retrieval: await this.retrieval.getStatus(),
      lifecycle: await this.lifecycle.getStatus(),
      automation: await this.automation.getStatus(),
      integration: await this.integration.getStatus()
    };
  }
}

export { MemoryManager };
export default MemoryManager;

if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new MemoryManager();
  manager.initialize().then(() => {
    console.log('Memory Manager ready');
  });
}
