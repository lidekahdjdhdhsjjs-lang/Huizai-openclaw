#!/usr/bin/env node
/**
 * P0: 记忆性能模块
 * - 缓存管理
 * - 懒加载
 * - 预加载
 * - 性能监控
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const CACHE_FILE = join(MEMORY_ROOT, 'core', '.cache.json');
const METRICS_FILE = join(MEMORY_ROOT, 'core', '.metrics.json');

class PerformanceManager {
  constructor(config = {}) {
    this.config = {
      cacheEnabled: true,
      cacheMaxSize: 1000,
      cacheTTL: 3600000,
      lazyLoad: true,
      preloadHot: true,
      preloadThreshold: 3,
      gpuAcceleration: false,
      metricsEnabled: true,
      ...config
    };
    this.cache = new Map();
    this.hotMemories = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalLatency: 0,
      queryCount: 0
    };
  }

  async initialize() {
    this.loadCache();
    this.loadMetrics();
    if (this.config.preloadHot) {
      await this.preloadHotMemories();
    }
    console.log('  ✓ 性能模块初始化完成');
  }

  loadCache() {
    try {
      if (existsSync(CACHE_FILE)) {
        const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
        for (const [key, value] of Object.entries(data)) {
          if (Date.now() - value.timestamp < this.config.cacheTTL) {
            this.cache.set(key, value);
          }
        }
      }
    } catch (e) {}
  }

  saveCache() {
    try {
      const data = {};
      for (const [key, value] of this.cache.entries()) {
        data[key] = value;
      }
      writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
  }

  loadMetrics() {
    try {
      if (existsSync(METRICS_FILE)) {
        this.metrics = { ...this.metrics, ...JSON.parse(readFileSync(METRICS_FILE, 'utf-8')) };
      }
    } catch (e) {}
  }

  saveMetrics() {
    try {
      writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
    } catch (e) {}
  }

  async checkCache(query) {
    if (!this.config.cacheEnabled) return null;
    
    const key = this.hashQuery(query);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      this.metrics.hits++;
      this.saveMetrics();
      return cached.data;
    }
    
    this.metrics.misses++;
    return null;
  }

  async cache(entry) {
    if (!this.config.cacheEnabled || !entry.id) return entry;
    
    if (this.cache.size >= this.config.cacheMaxSize) {
      this.evictLRU();
    }
    
    const key = entry.id || this.hashQuery(entry);
    this.cache.set(key, {
      data: entry,
      timestamp: Date.now(),
      accessCount: 1
    });
    
    this.saveCache();
    return entry;
  }

  cacheQueryResult(query, results) {
    if (!this.config.cacheEnabled) return;
    
    const key = this.hashQuery(query);
    this.cache.set(key, {
      data: results,
      timestamp: Date.now(),
      accessCount: 1,
      isQuery: true
    });
    
    this.saveCache();
  }

  hashQuery(query) {
    const content = typeof query === 'string' ? query : JSON.stringify(query);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `query_${Math.abs(hash).toString(16)}`;
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  async invalidateCache(id) {
    this.cache.delete(id);
    this.saveCache();
  }

  async preloadHotMemories() {
    const hotThreshold = this.config.preloadThreshold;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.accessCount >= hotThreshold) {
        this.hotMemories.set(key, value.data);
      }
    }
    
    console.log(`    预加载 ${this.hotMemories.size} 个热点记忆`);
  }

  getHotMemory(id) {
    return this.hotMemories.get(id);
  }

  recordAccess(id) {
    const cached = this.cache.get(id);
    if (cached) {
      cached.accessCount++;
      cached.timestamp = Date.now();
      
      if (cached.accessCount >= this.config.preloadThreshold) {
        this.hotMemories.set(id, cached.data);
      }
    }
  }

  recordMetrics(data) {
    if (!this.config.metricsEnabled) return;
    
    this.metrics.queryCount++;
    this.metrics.totalLatency += data.duration || 0;
    this.saveMetrics();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: this.metrics.queryCount > 0 
        ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)).toFixed(2)
        : 0,
      evictions: this.metrics.evictions,
      hotMemories: this.hotMemories.size
    };
  }

  getLatencyStats() {
    return {
      totalQueries: this.metrics.queryCount,
      totalLatency: this.metrics.totalLatency,
      avgLatency: this.metrics.queryCount > 0
        ? (this.metrics.totalLatency / this.metrics.queryCount).toFixed(2)
        : 0
    };
  }

  async getStatus() {
    return {
      cacheEnabled: this.config.cacheEnabled,
      cacheStats: this.getCacheStats(),
      latencyStats: this.getLatencyStats(),
      lazyLoadEnabled: this.config.lazyLoad,
      preloadEnabled: this.config.preloadHot,
      gpuAcceleration: this.config.gpuAcceleration
    };
  }

  clearCache() {
    this.cache.clear();
    this.hotMemories.clear();
    this.saveCache();
  }
}

export { PerformanceManager };
export default PerformanceManager;
