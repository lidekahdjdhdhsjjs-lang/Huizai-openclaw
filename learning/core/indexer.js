/**
 * 学习系统索引模块 (P1)
 * 负责多级索引构建、维护和查询
 */

import fs from 'fs/promises';
import path from 'path';

export class LearningIndexer {
    constructor(config = {}) {
        this.config = {
            indexPath: config.indexPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'indices', 'learning'),
            indexLevels: config.indexLevels ?? ['L0', 'L1', 'L2'],
            autoRebuild: config.autoRebuild ?? true,
            rebuildThreshold: config.rebuildThreshold ?? 1000,
            ...config
        };
        this.indices = {
            L0: new Map(),
            L1: new Map(),
            L2: new Map()
        };
        this.metadata = {
            lastRebuild: null,
            totalEntries: 0,
            indexStats: {}
        };
        this.pendingUpdates = [];
    }

    async initialize() {
        await fs.mkdir(this.config.indexPath, { recursive: true });
        await this.loadIndices();
    }

    buildIndices(learnings) {
        this.clearIndices();
        for (const learning of learnings) {
            this.addToIndex(learning);
        }
        this.metadata.lastRebuild = new Date().toISOString();
        this.metadata.totalEntries = learnings.length;
        this.updateIndexStats();
    }

    addToIndex(learning) {
        this.indexByTool(learning);
        this.indexByType(learning);
        this.indexByTime(learning);
        this.indexByError(learning);
        this.indexByQuality(learning);
        this.indexByCrystallization(learning);
        this.indexByPattern(learning);
        this.metadata.totalEntries++;
    }

    removeFromIndex(learningId) {
        for (const level of Object.values(this.indices)) {
            for (const entries of level.values()) {
                if (Array.isArray(entries)) {
                    const idx = entries.findIndex(e => e.id === learningId || e === learningId);
                    if (idx !== -1) {
                        entries.splice(idx, 1);
                    }
                }
            }
        }
        this.metadata.totalEntries--;
    }

    indexByTool(learning) {
        const tool = learning.tool || 'unknown';
        if (!this.indices.L0.has('byTool')) {
            this.indices.L0.set('byTool', new Map());
        }
        const toolIndex = this.indices.L0.get('byTool');
        if (!toolIndex.has(tool)) {
            toolIndex.set(tool, []);
        }
        toolIndex.get(tool).push({
            id: learning.id,
            timestamp: learning.timestamp,
            type: learning.type
        });
    }

    indexByType(learning) {
        const type = learning.type || 'unknown';
        if (!this.indices.L0.has('byType')) {
            this.indices.L0.set('byType', new Map());
        }
        const typeIndex = this.indices.L0.get('byType');
        if (!typeIndex.has(type)) {
            typeIndex.set(type, []);
        }
        typeIndex.get(type).push(learning.id);
    }

    indexByTime(learning) {
        const timestamp = new Date(learning.timestamp);
        const dateKey = timestamp.toISOString().split('T')[0];
        const monthKey = dateKey.substring(0, 7);
        const yearKey = dateKey.substring(0, 4);
        if (!this.indices.L1.has('byDate')) {
            this.indices.L1.set('byDate', new Map());
        }
        const dateIndex = this.indices.L1.get('byDate');
        if (!dateIndex.has(dateKey)) {
            dateIndex.set(dateKey, []);
        }
        dateIndex.get(dateKey).push(learning.id);
        if (!this.indices.L1.has('byMonth')) {
            this.indices.L1.set('byMonth', new Map());
        }
        const monthIndex = this.indices.L1.get('byMonth');
        if (!monthIndex.has(monthKey)) {
            monthIndex.set(monthKey, []);
        }
        monthIndex.get(monthKey).push(learning.id);
        if (!this.indices.L2.has('byYear')) {
            this.indices.L2.set('byYear', new Map());
        }
        const yearIndex = this.indices.L2.get('byYear');
        if (!yearIndex.has(yearKey)) {
            yearIndex.set(yearKey, []);
        }
        yearIndex.get(yearKey).push(learning.id);
    }

    indexByError(learning) {
        if (!learning.error) return;
        const errorWords = learning.error.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (!this.indices.L1.has('byErrorKeyword')) {
            this.indices.L1.set('byErrorKeyword', new Map());
        }
        const errorIndex = this.indices.L1.get('byErrorKeyword');
        for (const word of errorWords.slice(0, 10)) {
            if (!errorIndex.has(word)) {
                errorIndex.set(word, []);
            }
            errorIndex.get(word).push(learning.id);
        }
    }

    indexByQuality(learning) {
        const useCount = learning.useCount || 0;
        const qualityBucket = useCount >= 50 ? 'high' : useCount >= 10 ? 'medium' : 'low';
        if (!this.indices.L1.has('byQuality')) {
            this.indices.L1.set('byQuality', new Map());
        }
        const qualityIndex = this.indices.L1.get('byQuality');
        if (!qualityIndex.has(qualityBucket)) {
            qualityIndex.set(qualityBucket, []);
        }
        qualityIndex.get(qualityBucket).push(learning.id);
    }

    indexByCrystallization(learning) {
        const isCrystallized = !!learning.crystallizedTo;
        const key = isCrystallized ? 'crystallized' : 'pending';
        if (!this.indices.L0.has('byCrystallization')) {
            this.indices.L0.set('byCrystallization', new Map());
        }
        const crystIndex = this.indices.L0.get('byCrystallization');
        if (!crystIndex.has(key)) {
            crystIndex.set(key, []);
        }
        crystIndex.get(key).push(learning.id);
    }

    indexByPattern(learning) {
        if (!learning.resolution) return;
        const patternKey = `${learning.tool}:${learning.type}`;
        if (!this.indices.L2.has('byPattern')) {
            this.indices.L2.set('byPattern', new Map());
        }
        const patternIndex = this.indices.L2.get('byPattern');
        if (!patternIndex.has(patternKey)) {
            patternIndex.set(patternKey, []);
        }
        patternIndex.get(patternKey).push(learning.id);
    }

    queryByTool(tool) {
        const toolIndex = this.indices.L0.get('byTool');
        if (!toolIndex) return [];
        return toolIndex.get(tool) || [];
    }

    queryByType(type) {
        const typeIndex = this.indices.L0.get('byType');
        if (!typeIndex) return [];
        return typeIndex.get(type) || [];
    }

    queryByDate(date) {
        const dateIndex = this.indices.L1.get('byDate');
        if (!dateIndex) return [];
        return dateIndex.get(date) || [];
    }

    queryByMonth(month) {
        const monthIndex = this.indices.L1.get('byMonth');
        if (!monthIndex) return [];
        return monthIndex.get(month) || [];
    }

    queryByErrorKeyword(keyword) {
        const errorIndex = this.indices.L1.get('byErrorKeyword');
        if (!errorIndex) return [];
        return errorIndex.get(keyword.toLowerCase()) || [];
    }

    queryByQuality(quality) {
        const qualityIndex = this.indices.L1.get('byQuality');
        if (!qualityIndex) return [];
        return qualityIndex.get(quality) || [];
    }

    queryCrystallized(crystallized = true) {
        const crystIndex = this.indices.L0.get('byCrystallization');
        if (!crystIndex) return [];
        return crystIndex.get(crystallized ? 'crystallized' : 'pending') || [];
    }

    query(criteria) {
        let results = null;
        if (criteria.tool) {
            const toolResults = this.queryByTool(criteria.tool);
            results = this.mergeResults(results, toolResults.map(r => r.id || r));
        }
        if (criteria.type) {
            const typeResults = this.queryByType(criteria.type);
            results = this.mergeResults(results, typeResults);
        }
        if (criteria.date) {
            const dateResults = this.queryByDate(criteria.date);
            results = this.mergeResults(results, dateResults, 'and');
        }
        if (criteria.month) {
            const monthResults = this.queryByMonth(criteria.month);
            results = this.mergeResults(results, monthResults, 'and');
        }
        if (criteria.errorKeyword) {
            const errorResults = this.queryByErrorKeyword(criteria.errorKeyword);
            results = this.mergeResults(results, errorResults, 'and');
        }
        if (criteria.quality) {
            const qualityResults = this.queryByQuality(criteria.quality);
            results = this.mergeResults(results, qualityResults, 'and');
        }
        if (criteria.crystallized !== undefined) {
            const crystResults = this.queryCrystallized(criteria.crystallized);
            results = this.mergeResults(results, crystResults, 'and');
        }
        return results || [];
    }

    mergeResults(existing, newResults, operator = 'or') {
        if (!existing) return [...newResults];
        if (!newResults || newResults.length === 0) return existing;
        if (operator === 'or') {
            return [...new Set([...existing, ...newResults])];
        } else {
            const newSet = new Set(newResults);
            return existing.filter(id => newSet.has(id));
        }
    }

    clearIndices() {
        this.indices.L0.clear();
        this.indices.L1.clear();
        this.indices.L2.clear();
        this.metadata.totalEntries = 0;
    }

    updateIndexStats() {
        this.metadata.indexStats = {
            L0: {
                entries: this.indices.L0.size,
                totalItems: this.countItems(this.indices.L0)
            },
            L1: {
                entries: this.indices.L1.size,
                totalItems: this.countItems(this.indices.L1)
            },
            L2: {
                entries: this.indices.L2.size,
                totalItems: this.countItems(this.indices.L2)
            }
        };
    }

    countItems(index) {
        let count = 0;
        for (const value of index.values()) {
            if (value instanceof Map) {
                for (const items of value.values()) {
                    count += items.length;
                }
            }
        }
        return count;
    }

    async saveIndices() {
        const indexData = {
            metadata: this.metadata,
            indices: {
                L0: this.serializeIndex(this.indices.L0),
                L1: this.serializeIndex(this.indices.L1),
                L2: this.serializeIndex(this.indices.L2)
            }
        };
        const indexPath = path.join(this.config.indexPath, 'learning-index.json');
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    }

    async loadIndices() {
        try {
            const indexPath = path.join(this.config.indexPath, 'learning-index.json');
            const data = await fs.readFile(indexPath, 'utf8');
            const indexData = JSON.parse(data);
            this.metadata = indexData.metadata;
            this.indices.L0 = this.deserializeIndex(indexData.indices.L0);
            this.indices.L1 = this.deserializeIndex(indexData.indices.L1);
            this.indices.L2 = this.deserializeIndex(indexData.indices.L2);
        } catch {
            this.clearIndices();
        }
    }

    serializeIndex(index) {
        const serialized = {};
        for (const [key, value] of index.entries()) {
            if (value instanceof Map) {
                serialized[key] = {};
                for (const [k, v] of value.entries()) {
                    serialized[key][k] = v;
                }
            }
        }
        return serialized;
    }

    deserializeIndex(data) {
        const index = new Map();
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                const subMap = new Map();
                for (const [k, v] of Object.entries(value)) {
                    subMap.set(k, v);
                }
                index.set(key, subMap);
            }
        }
        return index;
    }

    getStats() {
        return {
            metadata: this.metadata,
            levelStats: {
                L0: { categories: this.indices.L0.size },
                L1: { categories: this.indices.L1.size },
                L2: { categories: this.indices.L2.size }
            }
        };
    }

    needsRebuild() {
        return this.metadata.totalEntries > this.config.rebuildThreshold && this.config.autoRebuild;
    }
}

export default LearningIndexer;
