/**
 * 学习系统管理器 - 统一入口
 * 整合所有学习模块提供统一API
 */

import LearningSecurity from './security.js';
import LearningPerformance from './performance.js';
import LearningQuality from './quality.js';
import LearningIndexer from './indexer.js';
import LearningRetrieval from './retrieval.js';
import LearningLifecycle from './lifecycle.js';
import LearningAutomation from './automation.js';
import LearningIntegration from './integration.js';
import fs from 'fs/promises';
import path from 'path';

export class LearningManager {
    constructor(config = {}) {
        this.config = {
            foundryPath: config.foundryPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'foundry'),
            ...config
        };
        this.security = new LearningSecurity(config.security);
        this.performance = new LearningPerformance(config.performance);
        this.quality = new LearningQuality(config.quality);
        this.indexer = new LearningIndexer(config.indexer);
        this.retrieval = new LearningRetrieval(config.retrieval);
        this.lifecycle = new LearningLifecycle(config.lifecycle);
        this.automation = new LearningAutomation(config.automation);
        this.integration = new LearningIntegration(config.integration);
        this.learnings = [];
        this.initialized = false;
    }

    async initialize(masterKey) {
        await this.security.initialize(masterKey);
        await this.indexer.initialize();
        await this.automation.initialize();
        await this.integration.initialize();
        await this.loadLearnings();
        this.initialized = true;
        return { success: true, message: 'Learning manager initialized' };
    }

    async loadLearnings() {
        try {
            const learningsPath = path.join(this.config.foundryPath, 'learnings.json');
            const data = await fs.readFile(learningsPath, 'utf8');
            this.learnings = JSON.parse(data);
            await this.indexer.buildIndices(this.learnings);
            return { loaded: this.learnings.length };
        } catch (error) {
            this.learnings = [];
            return { loaded: 0, error: error.message };
        }
    }

    async saveLearnings() {
        const learningsPath = path.join(this.config.foundryPath, 'learnings.json');
        await fs.mkdir(path.dirname(learningsPath), { recursive: true });
        await fs.writeFile(learningsPath, JSON.stringify(this.learnings, null, 2));
        return { saved: this.learnings.length };
    }

    async addLearning(learning) {
        const validation = this.security.validateLearningEntry(learning);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        learning.id = learning.id || this.security.generateSecureId('learn');
        learning.timestamp = learning.timestamp || new Date().toISOString();
        const dupCheck = this.quality.checkDuplicate(learning, this.learnings);
        if (dupCheck.isDuplicate) {
            return { success: false, reason: 'duplicate', duplicateOf: dupCheck.duplicateOf };
        }
        const enriched = this.quality.enrichLearning(learning);
        await this.automation.processLearning(enriched);
        this.learnings.push(enriched);
        this.indexer.addToIndex(enriched);
        await this.security.logAccess('add', learning.id, true, { type: learning.type });
        return { success: true, learning: enriched };
    }

    async getLearning(id) {
        const cached = this.performance.cacheGet(`learning:${id}`);
        if (cached) return cached;
        const learning = this.learnings.find(l => l.id === id);
        if (learning) {
            this.performance.cacheSet(`learning:${id}`, learning);
            await this.security.logAccess('get', id, true);
        }
        return learning || null;
    }

    async updateLearning(id, updates) {
        const idx = this.learnings.findIndex(l => l.id === id);
        if (idx === -1) {
            return { success: false, error: 'Learning not found' };
        }
        const sanitized = this.security.sanitizeData(updates);
        this.learnings[idx] = { ...this.learnings[idx], ...sanitized, updatedAt: new Date().toISOString() };
        this.performance.cacheDelete(`learning:${id}`);
        await this.security.logAccess('update', id, true, { updates: Object.keys(updates) });
        return { success: true, learning: this.learnings[idx] };
    }

    async deleteLearning(id) {
        const idx = this.learnings.findIndex(l => l.id === id);
        if (idx === -1) {
            return { success: false, error: 'Learning not found' };
        }
        this.learnings.splice(idx, 1);
        this.indexer.removeFromIndex(id);
        this.performance.cacheDelete(`learning:${id}`);
        await this.security.logAccess('delete', id, true);
        return { success: true };
    }

    async search(query, options = {}) {
        const timer = this.performance.startTimer('search');
        const indexResults = this.indexer.query(query);
        let candidates;
        if (indexResults.length > 0) {
            candidates = this.learnings.filter(l => indexResults.includes(l.id));
        } else {
            candidates = this.learnings;
        }
        const results = this.retrieval.search(candidates, query, options);
        const { duration } = timer.end();
        this.performance.recordMetric('search', duration, true);
        return results;
    }

    async findSimilar(id, options = {}) {
        const learning = await this.getLearning(id);
        if (!learning) {
            return { error: 'Learning not found' };
        }
        return this.retrieval.findSimilar(this.learnings, learning, options);
    }

    async getLearningsByTool(tool) {
        const cached = this.performance.cacheGet(`tool:${tool}`);
        if (cached) return cached;
        const results = this.learnings.filter(l => l.tool === tool);
        this.performance.cacheSet(`tool:${tool}`, results);
        return results;
    }

    async getLearningsByType(type) {
        const cached = this.performance.cacheGet(`type:${type}`);
        if (cached) return cached;
        const results = this.learnings.filter(l => l.type === type);
        this.performance.cacheSet(`type:${type}`, results);
        return results;
    }

    async getCrystallizedPatterns() {
        return this.learnings.filter(l => l.crystallizedTo);
    }

    async getPendingPatterns() {
        return this.learnings.filter(l => l.type === 'pattern' && !l.crystallizedTo);
    }

    async getTopLearnings(metric = 'useCount', limit = 10) {
        return this.retrieval.getTopLearnings(this.learnings, metric, limit);
    }

    async getRecentLearnings(days = 7) {
        return this.retrieval.getRecentLearnings(this.learnings, days);
    }

    async cleanup(options = {}) {
        const results = await this.lifecycle.cleanup(this.learnings, options);
        if (results.retained) {
            this.learnings = results.retained.map(r => r.learning);
        }
        await this.saveLearnings();
        await this.indexer.buildIndices(this.learnings);
        return results;
    }

    async sync() {
        const foundrySync = await this.integration.syncWithFoundry(this.learnings);
        if (foundrySync.newLearnings) {
            this.learnings.push(...foundrySync.newLearnings);
            await this.saveLearnings();
        }
        const memorySync = await this.integration.syncWithMemory(this.learnings);
        return { foundry: foundrySync, memory: memorySync };
    }

    async export(format = 'json', options = {}) {
        return this.integration.exportLearnings(this.learnings, format, options);
    }

    async import(filePath, options = {}) {
        const results = await this.integration.importLearnings(filePath, options);
        if (results.learnings) {
            for (const learning of results.learnings) {
                await this.addLearning(learning);
            }
        }
        return results;
    }

    getStats() {
        return {
            total: this.learnings.length,
            initialized: this.initialized,
            quality: this.quality.getStats(this.learnings),
            performance: this.performance.getPerformanceStats(),
            indexer: this.indexer.getStats(),
            automation: this.automation.getStats(),
            integration: this.integration.getStats(),
            security: this.security.getStats(),
            lifecycle: this.lifecycle.getStats()
        };
    }

    getHealthReport() {
        const stats = this.getStats();
        const issues = [];
        if (stats.performance.cache.hitRate < 0.5) {
            issues.push({ type: 'performance', message: 'Low cache hit rate', severity: 'warning' });
        }
        if (stats.quality.qualityDistribution.high < stats.total * 0.1) {
            issues.push({ type: 'quality', message: 'Few high-quality learnings', severity: 'info' });
        }
        if (stats.automation.scriptsRun === 0) {
            issues.push({ type: 'automation', message: 'No automations executed', severity: 'info' });
        }
        return {
            status: issues.length === 0 ? 'healthy' : issues.some(i => i.severity === 'critical') ? 'critical' : 'warning',
            issues,
            stats
        };
    }

    async optimize() {
        const perfOpt = this.performance.optimize();
        const cleanupResults = await this.cleanup({ autoArchive: true });
        await this.indexer.buildIndices(this.learnings);
        return {
            performance: perfOpt,
            cleanup: cleanupResults,
            reindexed: true
        };
    }
}

export default LearningManager;
