/**
 * 学习系统检索模块 (P2)
 * 负责混合检索、MMR去重、时序衰减和智能排序
 */

export class LearningRetrieval {
    constructor(config = {}) {
        this.config = {
            mmrLambda: config.mmrLambda ?? 0.7,
            mmrK: config.mmrK ?? 10,
            temporalDecayHalfLife: config.temporalDecayHalfLife ?? 60 * 24 * 60 * 60 * 1000,
            maxResults: config.maxResults ?? 50,
            minRelevance: config.minRelevance ?? 0.3,
            hybridWeights: config.hybridWeights ?? {
                keyword: 0.4,
                semantic: 0.3,
                temporal: 0.2,
                quality: 0.1
            },
            ...config
        };
        this.retrievalCache = new Map();
    }

    search(learnings, query, options = {}) {
        const maxResults = options.maxResults || this.config.maxResults;
        const candidates = this.findCandidates(learnings, query, options);
        const scored = this.scoreCandidates(candidates, query, options);
        const filtered = scored.filter(c => c.relevance >= this.config.minRelevance);
        const ranked = this.mmrRerank(filtered, query, maxResults);
        return ranked;
    }

    findCandidates(learnings, query, options) {
        const candidates = [];
        const keywords = this.extractKeywords(query);
        for (const learning of learnings) {
            const scores = {};
            let isCandidate = false;
            if (query.tool && learning.tool === query.tool) {
                scores.toolMatch = 1;
                isCandidate = true;
            }
            if (query.type && learning.type === query.type) {
                scores.typeMatch = 1;
                isCandidate = true;
            }
            if (query.errorPattern && learning.error) {
                const errorMatch = this.matchErrorPattern(learning.error, query.errorPattern);
                scores.errorMatch = errorMatch;
                if (errorMatch > 0.5) isCandidate = true;
            }
            if (keywords.length > 0) {
                const keywordScore = this.matchKeywords(learning, keywords);
                scores.keywordMatch = keywordScore;
                if (keywordScore > 0.3) isCandidate = true;
            }
            if (isCandidate || options.allCandidates) {
                candidates.push({ learning, scores });
            }
        }
        return candidates;
    }

    extractKeywords(query) {
        const keywords = [];
        if (query.text) {
            keywords.push(...query.text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        }
        if (query.keywords) {
            keywords.push(...query.keywords.map(k => k.toLowerCase()));
        }
        return [...new Set(keywords)];
    }

    matchErrorPattern(error, pattern) {
        if (typeof pattern === 'string') {
            return error.toLowerCase().includes(pattern.toLowerCase()) ? 1 : 0;
        }
        if (pattern instanceof RegExp) {
            return pattern.test(error) ? 1 : 0;
        }
        return 0;
    }

    matchKeywords(learning, keywords) {
        const learningText = [
            learning.tool,
            learning.error,
            learning.resolution,
            learning.type
        ].filter(Boolean).join(' ').toLowerCase();
        let matchCount = 0;
        for (const keyword of keywords) {
            if (learningText.includes(keyword)) {
                matchCount++;
            }
        }
        return keywords.length > 0 ? matchCount / keywords.length : 0;
    }

    scoreCandidates(candidates, query, options) {
        return candidates.map(({ learning, scores }) => {
            const relevance = this.calculateRelevance(learning, query, scores);
            const temporal = this.calculateTemporalScore(learning);
            const quality = this.calculateQualityScore(learning);
            const finalScore = relevance * 0.5 + temporal * 0.3 + quality * 0.2;
            return {
                learning,
                relevance,
                temporal,
                quality,
                finalScore,
                matchScores: scores
            };
        });
    }

    calculateRelevance(learning, query, matchScores) {
        const weights = this.config.hybridWeights;
        let score = 0;
        const keywordScore = matchScores.keywordMatch || matchScores.errorMatch || 0;
        score += keywordScore * weights.keyword;
        const semanticScore = this.calculateSemanticSimilarity(learning, query);
        score += semanticScore * weights.semantic;
        return Math.min(1, score);
    }

    calculateSemanticSimilarity(learning, query) {
        let similarity = 0;
        if (query.tool && learning.tool === query.tool) similarity += 0.3;
        if (query.type && learning.type === query.type) similarity += 0.2;
        if (query.resolutionHint && learning.resolution) {
            const hintWords = query.resolutionHint.toLowerCase().split(/\s+/);
            const resolutionWords = learning.resolution.toLowerCase().split(/\s+/);
            const overlap = hintWords.filter(w => resolutionWords.includes(w)).length;
            similarity += (overlap / Math.max(hintWords.length, 1)) * 0.5;
        }
        return Math.min(1, similarity);
    }

    calculateTemporalScore(learning) {
        const timestamp = new Date(learning.timestamp).getTime();
        const age = Date.now() - timestamp;
        const halfLife = this.config.temporalDecayHalfLife;
        return Math.pow(0.5, age / halfLife);
    }

    calculateQualityScore(learning) {
        const useCount = learning.useCount || 0;
        const crystallized = learning.crystallizedTo ? 0.3 : 0;
        const trajectory = learning.improvementTrajectory || [];
        const recentImprovement = trajectory.slice(-5).filter(v => v === 1).length / Math.max(5, trajectory.length);
        return Math.min(1, (useCount / 100) * 0.5 + crystallized + recentImprovement * 0.2);
    }

    mmrRerank(candidates, query, k) {
        if (candidates.length <= k) {
            return candidates.sort((a, b) => b.finalScore - a.finalScore);
        }
        const selected = [];
        const remaining = [...candidates].sort((a, b) => b.finalScore - a.finalScore);
        const lambda = this.config.mmrLambda;
        while (selected.length < k && remaining.length > 0) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const candidate = remaining[i];
                const relevance = candidate.finalScore;
                let maxSimilarity = 0;
                for (const s of selected) {
                    const sim = this.calculateLearningSimilarity(candidate.learning, s.learning);
                    maxSimilarity = Math.max(maxSimilarity, sim);
                }
                const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
                if (mmrScore > bestScore) {
                    bestScore = mmrScore;
                    bestIdx = i;
                }
            }
            selected.push(remaining[bestIdx]);
            remaining.splice(bestIdx, 1);
        }
        return selected;
    }

    calculateLearningSimilarity(learning1, learning2) {
        let similarity = 0;
        if (learning1.tool === learning2.tool) similarity += 0.3;
        if (learning1.type === learning2.type) similarity += 0.2;
        if (learning1.error && learning2.error) {
            const words1 = new Set(learning1.error.toLowerCase().split(/\s+/));
            const words2 = new Set(learning2.error.toLowerCase().split(/\s+/));
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            similarity += (intersection.size / union.size) * 0.5;
        }
        return similarity;
    }

    findSimilar(learnings, targetLearning, options = {}) {
        const maxResults = options.maxResults || 10;
        const minSimilarity = options.minSimilarity || 0.5;
        const similarities = learnings
            .filter(l => l.id !== targetLearning.id)
            .map(learning => ({
                learning,
                similarity: this.calculateLearningSimilarity(learning, targetLearning)
            }))
            .filter(s => s.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
        return similarities;
    }

    findRelatedPatterns(learnings, pattern, options = {}) {
        return this.search(learnings, {
            tool: pattern.tool,
            type: 'pattern',
            errorPattern: pattern.errorHint
        }, options);
    }

    getRecentLearnings(learnings, days = 7) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return learnings
            .filter(l => new Date(l.timestamp).getTime() >= cutoff)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    getTopLearnings(learnings, metric = 'useCount', limit = 10) {
        return [...learnings]
            .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
            .slice(0, limit);
    }

    clearCache() {
        this.retrievalCache.clear();
    }

    getStats() {
        return {
            cacheSize: this.retrievalCache.size,
            config: {
                mmrLambda: this.config.mmrLambda,
                maxResults: this.config.maxResults,
                minRelevance: this.config.minRelevance
            }
        };
    }
}

export default LearningRetrieval;
