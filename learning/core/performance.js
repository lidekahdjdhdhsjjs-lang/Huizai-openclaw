/**
 * 学习系统性能模块 (P0)
 * 负责缓存、懒加载、预加载、批量处理和性能监控
 */

import fs from 'fs/promises';
import path from 'path';

export class LearningPerformance {
    constructor(config = {}) {
        this.config = {
            cacheEnabled: config.cacheEnabled ?? true,
            cacheMaxSize: config.cacheMaxSize ?? 1000,
            cacheTTL: config.cacheTTL ?? 30 * 60 * 1000,
            lazyLoadEnabled: config.lazyLoadEnabled ?? true,
            preloadEnabled: config.preloadEnabled ?? true,
            batchSize: config.batchSize ?? 100,
            maxConcurrentOps: config.maxConcurrentOps ?? 10,
            metricsEnabled: config.metricsEnabled ?? true,
            ...config
        };
        this.cache = new Map();
        this.cacheMetadata = new Map();
        this.pendingLoads = new Map();
        this.operationQueue = [];
        this.activeOperations = 0;
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            loadTimes: [],
            operationCounts: new Map()
        };
        this.preloadedData = new Map();
    }

    cacheGet(key) {
        if (!this.config.cacheEnabled) return null;
        const metadata = this.cacheMetadata.get(key);
        if (!metadata) return null;
        if (Date.now() - metadata.timestamp > this.config.cacheTTL) {
            this.cache.delete(key);
            this.cacheMetadata.delete(key);
            this.metrics.evictions++;
            return null;
        }
        metadata.accessCount++;
        metadata.lastAccess = Date.now();
        this.metrics.hits++;
        return this.cache.get(key);
    }

    cacheSet(key, value, options = {}) {
        if (!this.config.cacheEnabled) return;
        if (this.cache.size >= this.config.cacheMaxSize) {
            this.evictLRU();
        }
        this.cache.set(key, value);
        this.cacheMetadata.set(key, {
            timestamp: Date.now(),
            accessCount: 1,
            lastAccess: Date.now(),
            size: options.size ?? 1,
            priority: options.priority ?? 'normal'
        });
    }

    cacheDelete(key) {
        this.cache.delete(key);
        this.cacheMetadata.delete(key);
    }

    cacheClear() {
        this.cache.clear();
        this.cacheMetadata.clear();
    }

    evictLRU() {
        let lruKey = null;
        let lruAccess = Infinity;
        for (const [key, metadata] of this.cacheMetadata) {
            if (metadata.lastAccess < lruAccess) {
                lruAccess = metadata.lastAccess;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
            this.cacheMetadata.delete(lruKey);
            this.metrics.evictions++;
        }
    }

    async lazyLoad(key, loader) {
        if (!this.config.lazyLoadEnabled) {
            return await loader();
        }
        const cached = this.cacheGet(key);
        if (cached !== null) {
            return cached;
        }
        if (this.pendingLoads.has(key)) {
            return await this.pendingLoads.get(key);
        }
        const loadPromise = (async () => {
            const startTime = Date.now();
            const data = await loader();
            const loadTime = Date.now() - startTime;
            this.metrics.loadTimes.push(loadTime);
            if (this.metrics.loadTimes.length > 1000) {
                this.metrics.loadTimes = this.metrics.loadTimes.slice(-500);
            }
            this.cacheSet(key, data);
            this.pendingLoads.delete(key);
            return data;
        })();
        this.pendingLoads.set(key, loadPromise);
        this.metrics.misses++;
        return await loadPromise;
    }

    async preload(keys, loader) {
        if (!this.config.preloadEnabled) return;
        const promises = keys.map(async (key) => {
            if (this.cacheGet(key) !== null) return;
            try {
                const data = await loader(key);
                this.cacheSet(key, data);
                this.preloadedData.set(key, true);
            } catch (error) {
                console.error(`Preload failed for ${key}:`, error.message);
            }
        });
        await Promise.all(promises);
    }

    async batchProcess(items, processor, options = {}) {
        const batchSize = options.batchSize ?? this.config.batchSize;
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => this.enqueueOperation(() => processor(item)))
            );
            results.push(...batchResults);
        }
        return results;
    }

    async enqueueOperation(operation) {
        return new Promise((resolve, reject) => {
            this.operationQueue.push({ operation, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        while (this.operationQueue.length > 0 && this.activeOperations < this.config.maxConcurrentOps) {
            const { operation, resolve, reject } = this.operationQueue.shift();
            this.activeOperations++;
            try {
                const result = await operation();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.activeOperations--;
                if (this.operationQueue.length > 0) {
                    setImmediate(() => this.processQueue());
                }
            }
        }
    }

    startTimer(operation) {
        return {
            operation,
            startTime: Date.now(),
            end: function() {
                const duration = Date.now() - this.startTime;
                return { operation: this.operation, duration };
            }
        };
    }

    recordMetric(operation, duration, success = true) {
        if (!this.config.metricsEnabled) return;
        const count = this.metrics.operationCounts.get(operation) || { total: 0, success: 0, failure: 0, totalDuration: 0 };
        count.total++;
        count[success ? 'success' : 'failure']++;
        count.totalDuration += duration;
        this.metrics.operationCounts.set(operation, count);
    }

    getMetric(operation) {
        const count = this.metrics.operationCounts.get(operation);
        if (!count) return null;
        return {
            ...count,
            avgDuration: count.total > 0 ? count.totalDuration / count.total : 0,
            successRate: count.total > 0 ? count.success / count.total : 0
        };
    }

    getCacheStats() {
        let totalSize = 0;
        let totalAccess = 0;
        for (const metadata of this.cacheMetadata.values()) {
            totalSize += metadata.size;
            totalAccess += metadata.accessCount;
        }
        return {
            enabled: this.config.cacheEnabled,
            entries: this.cache.size,
            maxSize: this.config.cacheMaxSize,
            utilization: this.cache.size / this.config.cacheMaxSize,
            totalSize,
            totalAccess,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: this.metrics.hits + this.metrics.misses > 0 
                ? this.metrics.hits / (this.metrics.hits + this.metrics.misses) 
                : 0,
            evictions: this.metrics.evictions
        };
    }

    getPerformanceStats() {
        const loadTimes = this.metrics.loadTimes;
        const avgLoadTime = loadTimes.length > 0 
            ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
            : 0;
        const p50 = loadTimes.length > 0 
            ? loadTimes.sort((a, b) => a - b)[Math.floor(loadTimes.length * 0.5)] 
            : 0;
        const p95 = loadTimes.length > 0 
            ? loadTimes.sort((a, b) => a - b)[Math.floor(loadTimes.length * 0.95)] 
            : 0;
        const p99 = loadTimes.length > 0 
            ? loadTimes.sort((a, b) => a - b)[Math.floor(loadTimes.length * 0.99)] 
            : 0;
        const operationStats = {};
        for (const [op, count] of this.metrics.operationCounts) {
            operationStats[op] = this.getMetric(op);
        }
        return {
            cache: this.getCacheStats(),
            loadTimes: {
                count: loadTimes.length,
                avg: avgLoadTime,
                p50,
                p95,
                p99
            },
            operations: operationStats,
            queue: {
                pending: this.operationQueue.length,
                active: this.activeOperations,
                maxConcurrent: this.config.maxConcurrentOps
            },
            preloaded: this.preloadedData.size
        };
    }

    optimize() {
        const stats = this.getPerformanceStats();
        const recommendations = [];
        if (stats.cache.hitRate < 0.7) {
            recommendations.push({
                type: 'cache',
                message: 'Low cache hit rate, consider increasing cache size or TTL',
                current: stats.cache.hitRate,
                suggested: '> 0.7'
            });
        }
        if (stats.queue.pending > 50) {
            recommendations.push({
                type: 'concurrency',
                message: 'High queue backlog, consider increasing maxConcurrentOps',
                current: stats.queue.pending,
                suggested: '< 50'
            });
        }
        if (stats.loadTimes.p95 > 1000) {
            recommendations.push({
                type: 'performance',
                message: 'Slow load times detected, consider preloading or optimizing data access',
                current: stats.loadTimes.p95,
                suggested: '< 1000ms'
            });
        }
        return { stats, recommendations };
    }

    async warmup(keys, loader) {
        const startTime = Date.now();
        await this.preload(keys, loader);
        return {
            warmed: keys.length,
            duration: Date.now() - startTime
        };
    }

    reset() {
        this.cacheClear();
        this.preloadedData.clear();
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            loadTimes: [],
            operationCounts: new Map()
        };
    }
}

export default LearningPerformance;
