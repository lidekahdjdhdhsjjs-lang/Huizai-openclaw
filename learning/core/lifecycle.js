/**
 * 学习系统生命周期模块 (P2)
 * 负责学习数据的保留策略、归档和清理
 */

import fs from 'fs/promises';
import path from 'path';

export class LearningLifecycle {
    constructor(config = {}) {
        this.config = {
            retentionPolicies: config.retentionPolicies ?? {
                P0: { maxAge: Infinity, minUseCount: 50, keepCrystallized: true },
                P1: { maxAge: 365 * 24 * 60 * 60 * 1000, minUseCount: 10, keepCrystallized: true },
                P2: { maxAge: 180 * 24 * 60 * 60 * 1000, minUseCount: 5, keepCrystallized: false },
                P3: { maxAge: 90 * 24 * 60 * 60 * 1000, minUseCount: 0, keepCrystallized: false }
            },
            archiveEnabled: config.archiveEnabled ?? true,
            archivePath: config.archivePath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'archive', 'learning'),
            cleanupInterval: config.cleanupInterval ?? 24 * 60 * 60 * 1000,
            batchSize: config.batchSize ?? 100,
            ...config
        };
        this.stats = {
            lastCleanup: null,
            archived: 0,
            deleted: 0,
            retained: 0
        };
    }

    classifyLearning(learning) {
        const quality = this.assessLearningQuality(learning);
        if (quality.score >= 0.8 || learning.crystallizedTo) {
            return 'P0';
        }
        if (quality.score >= 0.6 || learning.useCount >= 20) {
            return 'P1';
        }
        if (quality.score >= 0.4 || learning.useCount >= 5) {
            return 'P2';
        }
        return 'P3';
    }

    assessLearningQuality(learning) {
        let score = 0;
        const factors = [];
        if (learning.crystallizedTo) {
            score += 0.4;
            factors.push('crystallized');
        }
        if (learning.useCount >= 50) {
            score += 0.3;
            factors.push('high_usage');
        } else if (learning.useCount >= 10) {
            score += 0.15;
            factors.push('moderate_usage');
        }
        if (learning.resolution) {
            score += 0.2;
            factors.push('resolved');
        }
        const trajectory = learning.improvementTrajectory || [];
        if (trajectory.length > 0) {
            const improving = trajectory.slice(-5).filter(v => v === 1).length / Math.min(5, trajectory.length);
            if (improving > 0.8) {
                score += 0.1;
                factors.push('improving');
            }
        }
        return { score: Math.min(1, score), factors };
    }

    shouldRetain(learning, priority = null) {
        const classifiedPriority = priority || this.classifyLearning(learning);
        const policy = this.config.retentionPolicies[classifiedPriority];
        if (!policy) return { retain: true, reason: 'no_policy' };
        if (policy.keepCrystallized && learning.crystallizedTo) {
            return { retain: true, reason: 'crystallized', priority: classifiedPriority };
        }
        if (learning.useCount >= policy.minUseCount) {
            return { retain: true, reason: 'use_count', priority: classifiedPriority };
        }
        const age = Date.now() - new Date(learning.timestamp).getTime();
        if (age > policy.maxAge) {
            return { retain: false, reason: 'expired', priority: classifiedPriority };
        }
        return { retain: true, reason: 'within_policy', priority: classifiedPriority };
    }

    async applyRetention(learnings, options = {}) {
        const results = {
            retained: [],
            archived: [],
            deleted: []
        };
        for (const learning of learnings) {
            const decision = this.shouldRetain(learning);
            if (decision.retain) {
                results.retained.push({ learning, decision });
            } else if (this.config.archiveEnabled && !options.skipArchive) {
                results.archived.push({ learning, decision });
            } else {
                results.deleted.push({ learning, decision });
            }
        }
        return results;
    }

    async archiveLearnings(learnings) {
        if (!this.config.archiveEnabled) {
            return { archived: 0, error: 'Archive disabled' };
        }
        await fs.mkdir(this.config.archivePath, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFile = path.join(this.config.archivePath, `learnings-${timestamp}.json`);
        const archiveData = {
            archivedAt: new Date().toISOString(),
            count: learnings.length,
            learnings
        };
        await fs.writeFile(archiveFile, JSON.stringify(archiveData, null, 2));
        this.stats.archived += learnings.length;
        return { archived: learnings.length, file: archiveFile };
    }

    async loadArchive(archiveFile) {
        try {
            const data = await fs.readFile(archiveFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { error: error.message, learnings: [] };
        }
    }

    async listArchives() {
        try {
            const files = await fs.readdir(this.config.archivePath);
            return files
                .filter(f => f.startsWith('learnings-') && f.endsWith('.json'))
                .sort()
                .reverse();
        } catch {
            return [];
        }
    }

    async cleanup(learnings, options = {}) {
        const startTime = Date.now();
        const results = await this.applyRetention(learnings, options);
        if (results.archived.length > 0) {
            await this.archiveLearnings(results.archived.map(r => r.learning));
        }
        this.stats.lastCleanup = new Date().toISOString();
        this.stats.retained = results.retained.length;
        this.stats.deleted = results.deleted.length;
        return {
            ...results,
            stats: {
                ...this.stats,
                duration: Date.now() - startTime
            }
        };
    }

    scheduleNextCleanup() {
        return {
            nextCleanup: new Date(Date.now() + this.config.cleanupInterval).toISOString(),
            intervalMs: this.config.cleanupInterval
        };
    }

    getAgingReport(learnings) {
        const now = Date.now();
        const buckets = {
            '0-7d': [],
            '7-30d': [],
            '30-90d': [],
            '90-180d': [],
            '180-365d': [],
            '>365d': []
        };
        for (const learning of learnings) {
            const age = now - new Date(learning.timestamp).getTime();
            const days = age / (24 * 60 * 60 * 1000);
            if (days <= 7) buckets['0-7d'].push(learning);
            else if (days <= 30) buckets['7-30d'].push(learning);
            else if (days <= 90) buckets['30-90d'].push(learning);
            else if (days <= 180) buckets['90-180d'].push(learning);
            else if (days <= 365) buckets['180-365d'].push(learning);
            else buckets['>365d'].push(learning);
        }
        const summary = {};
        for (const [bucket, items] of Object.entries(buckets)) {
            summary[bucket] = {
                count: items.length,
                crystallized: items.filter(l => l.crystallizedTo).length,
                avgUseCount: items.length > 0 
                    ? items.reduce((sum, l) => sum + (l.useCount || 0), 0) / items.length 
                    : 0
            };
        }
        return summary;
    }

    getPriorityDistribution(learnings) {
        const distribution = { P0: 0, P1: 0, P2: 0, P3: 0 };
        for (const learning of learnings) {
            const priority = this.classifyLearning(learning);
            distribution[priority]++;
        }
        return distribution;
    }

    getStats() {
        return {
            ...this.stats,
            config: {
                archiveEnabled: this.config.archiveEnabled,
                retentionPolicies: Object.keys(this.config.retentionPolicies)
            }
        };
    }

    async exportForAnalysis(learnings, outputPath) {
        const report = {
            generatedAt: new Date().toISOString(),
            total: learnings.length,
            priorityDistribution: this.getPriorityDistribution(learnings),
            agingReport: this.getAgingReport(learnings),
            stats: this.getStats(),
            learnings: learnings.map(l => ({
                id: l.id,
                type: l.type,
                tool: l.tool,
                priority: this.classifyLearning(l),
                quality: this.assessLearningQuality(l)
            }))
        };
        await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
        return report;
    }
}

export default LearningLifecycle;
