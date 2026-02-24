/**
 * 学习系统质量模块 (P1)
 * 负责学习质量评估、重要性评分、去重和置信度计算
 */

import crypto from 'crypto';

export class LearningQuality {
    constructor(config = {}) {
        this.config = {
            importanceWeights: config.importanceWeights ?? {
                useCount: 0.3,
                recency: 0.2,
                successRate: 0.25,
                crystallized: 0.15,
                feedbackScore: 0.1
            },
            dedupThreshold: config.dedupThreshold ?? 0.85,
            minConfidence: config.minConfidence ?? 0.5,
            maxConfidence: config.maxConfidence ?? 1.0,
            decayFactor: config.decayFactor ?? 0.95,
            qualityThresholds: config.qualityThresholds ?? {
                high: 0.8,
                medium: 0.5,
                low: 0.3
            },
            ...config
        };
        this.qualityCache = new Map();
        this.dedupIndex = new Map();
        this.feedbackHistory = new Map();
    }

    calculateImportance(learning) {
        const weights = this.config.importanceWeights;
        let score = 0;
        const useCountScore = Math.min(learning.useCount / 100, 1);
        score += useCountScore * weights.useCount;
        const age = Date.now() - new Date(learning.timestamp).getTime();
        const recencyScore = Math.exp(-age / (30 * 24 * 60 * 60 * 1000));
        score += recencyScore * weights.recency;
        const successRate = learning.attemptCount > 0 
            ? (learning.useCount - learning.attemptCount) / learning.useCount 
            : 1;
        score += Math.max(0, successRate) * weights.successRate;
        if (learning.crystallizedTo) {
            score += weights.crystallized;
        }
        const feedbackScore = this.calculateFeedbackScore(learning);
        score += feedbackScore * weights.feedbackScore;
        return Math.min(1, Math.max(0, score));
    }

    calculateFeedbackScore(learning) {
        const feedback = learning.executionFeedback || [];
        if (feedback.length === 0) return 0.5;
        const positiveCount = feedback.filter(f => f.positive).length;
        return positiveCount / feedback.length;
    }

    calculateConfidence(learning) {
        const factors = [];
        if (learning.useCount >= 10) {
            factors.push(0.3 + Math.min(learning.useCount / 100, 0.7));
        } else {
            factors.push(learning.useCount / 10 * 0.3);
        }
        if (learning.resolution) {
            factors.push(0.8);
        }
        if (learning.improvementTrajectory && learning.improvementTrajectory.length > 0) {
            const trajectory = learning.improvementTrajectory;
            const improving = trajectory.slice(-5).filter(v => v === 1).length / Math.min(5, trajectory.length);
            factors.push(improving);
        }
        if (learning.crystallizedTo) {
            factors.push(0.9);
        }
        if (factors.length === 0) return this.config.minConfidence;
        const avgConfidence = factors.reduce((a, b) => a + b, 0) / factors.length;
        return Math.min(this.config.maxConfidence, Math.max(this.config.minConfidence, avgConfidence));
    }

    assessQuality(learning) {
        const importance = this.calculateImportance(learning);
        const confidence = this.calculateConfidence(learning);
        const qualityScore = (importance + confidence) / 2;
        let qualityLevel = 'low';
        if (qualityScore >= this.config.qualityThresholds.high) {
            qualityLevel = 'high';
        } else if (qualityScore >= this.config.qualityThresholds.medium) {
            qualityLevel = 'medium';
        }
        return {
            importance,
            confidence,
            qualityScore,
            qualityLevel,
            factors: {
                useCount: learning.useCount,
                crystallized: !!learning.crystallizedTo,
                hasResolution: !!learning.resolution,
                trajectoryLength: learning.improvementTrajectory?.length || 0
            }
        };
    }

    generateHash(learning) {
        const keyData = {
            type: learning.type,
            tool: learning.tool,
            error: learning.error?.substring(0, 200)
        };
        return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
    }

    checkDuplicate(learning, existingLearnings) {
        const hash = this.generateHash(learning);
        if (this.dedupIndex.has(hash)) {
            const existingId = this.dedupIndex.get(hash);
            return { isDuplicate: true, duplicateOf: existingId, similarity: 1 };
        }
        for (const existing of existingLearnings) {
            const similarity = this.calculateSimilarity(learning, existing);
            if (similarity >= this.config.dedupThreshold) {
                return { isDuplicate: true, duplicateOf: existing.id, similarity };
            }
        }
        this.dedupIndex.set(hash, learning.id);
        return { isDuplicate: false, similarity: 0 };
    }

    calculateSimilarity(learning1, learning2) {
        let similarity = 0;
        let totalWeight = 0;
        if (learning1.type === learning2.type) {
            similarity += 0.2;
        }
        totalWeight += 0.2;
        if (learning1.tool === learning2.tool) {
            similarity += 0.3;
        }
        totalWeight += 0.3;
        if (learning1.error && learning2.error) {
            const error1 = learning1.error.toLowerCase();
            const error2 = learning2.error.toLowerCase();
            const words1 = new Set(error1.split(/\s+/));
            const words2 = new Set(error2.split(/\s+/));
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            const jaccard = intersection.size / union.size;
            similarity += jaccard * 0.5;
        }
        totalWeight += 0.5;
        return similarity / totalWeight;
    }

    deduplicateLearnings(learnings) {
        const unique = [];
        const duplicates = [];
        const seen = new Map();
        for (const learning of learnings) {
            const dupCheck = this.checkDuplicate(learning, Array.from(seen.values()));
            if (dupCheck.isDuplicate) {
                duplicates.push({
                    id: learning.id,
                    duplicateOf: dupCheck.duplicateOf,
                    similarity: dupCheck.similarity
                });
            } else {
                unique.push(learning);
                seen.set(learning.id, learning);
            }
        }
        return { unique, duplicates, dedupRate: duplicates.length / learnings.length };
    }

    rankLearnings(learnings, criteria = {}) {
        const ranked = learnings.map(learning => {
            const quality = this.assessQuality(learning);
            let score = quality.qualityScore;
            if (criteria.priorityTools && criteria.priorityTools.includes(learning.tool)) {
                score *= 1.2;
            }
            if (criteria.minConfidence && quality.confidence < criteria.minConfidence) {
                score *= 0.5;
            }
            if (criteria.requireResolution && !learning.resolution) {
                score *= 0.3;
            }
            return { learning, quality, score };
        });
        ranked.sort((a, b) => b.score - a.score);
        return ranked;
    }

    filterByQuality(learnings, minQuality = 'medium') {
        const threshold = this.config.qualityThresholds[minQuality] || 0.5;
        return learnings.filter(learning => {
            const quality = this.assessQuality(learning);
            return quality.qualityScore >= threshold;
        });
    }

    addFeedback(learningId, feedback) {
        if (!this.feedbackHistory.has(learningId)) {
            this.feedbackHistory.set(learningId, []);
        }
        this.feedbackHistory.get(learningId).push({
            ...feedback,
            timestamp: new Date().toISOString()
        });
    }

    getFeedbackStats(learningId) {
        const feedback = this.feedbackHistory.get(learningId) || [];
        if (feedback.length === 0) return null;
        const positive = feedback.filter(f => f.positive).length;
        return {
            total: feedback.length,
            positive,
            negative: feedback.length - positive,
            rate: positive / feedback.length,
            recent: feedback.slice(-5)
        };
    }

    calculateDecay(learning, baseDate = new Date()) {
        const age = baseDate.getTime() - new Date(learning.timestamp).getTime();
        const days = age / (24 * 60 * 60 * 1000);
        return Math.pow(this.config.decayFactor, days);
    }

    getStats(learnings) {
        const qualityDistribution = { high: 0, medium: 0, low: 0 };
        let totalImportance = 0;
        let totalConfidence = 0;
        const toolStats = new Map();
        for (const learning of learnings) {
            const quality = this.assessQuality(learning);
            qualityDistribution[quality.qualityLevel]++;
            totalImportance += quality.importance;
            totalConfidence += quality.confidence;
            const tool = learning.tool || 'unknown';
            if (!toolStats.has(tool)) {
                toolStats.set(tool, { count: 0, avgQuality: 0, totalQuality: 0 });
            }
            const stats = toolStats.get(tool);
            stats.count++;
            stats.totalQuality += quality.qualityScore;
        }
        const toolStatsArray = Array.from(toolStats.entries()).map(([tool, stats]) => ({
            tool,
            count: stats.count,
            avgQuality: stats.totalQuality / stats.count
        }));
        return {
            total: learnings.length,
            qualityDistribution,
            avgImportance: learnings.length > 0 ? totalImportance / learnings.length : 0,
            avgConfidence: learnings.length > 0 ? totalConfidence / learnings.length : 0,
            toolStats: toolStatsArray.sort((a, b) => b.avgQuality - a.avgQuality)
        };
    }

    validateLearning(learning) {
        const errors = [];
        if (!learning.id) errors.push('Missing id');
        if (!learning.type) errors.push('Missing type');
        if (!learning.timestamp) errors.push('Missing timestamp');
        if (learning.useCount === undefined) errors.push('Missing useCount');
        if (typeof learning.useCount !== 'number' || learning.useCount < 0) {
            errors.push('Invalid useCount');
        }
        return { valid: errors.length === 0, errors };
    }

    enrichLearning(learning) {
        const quality = this.assessQuality(learning);
        const decay = this.calculateDecay(learning);
        return {
            ...learning,
            _quality: quality,
            _decay: decay,
            _enrichedAt: new Date().toISOString()
        };
    }
}

export default LearningQuality;
