/**
 * 进化系统检索模块 (P2)
 * 负责基因检索、进化历史查询、祖先追溯
 */

export class EvolutionRetrieval {
    constructor(config = {}) {
        this.config = {
            maxResults: config.maxResults ?? 50,
            minRelevance: config.minRelevance ?? 0.3,
            temporalDecay: config.temporalDecay ?? 0.95,
            ...config
        };
        this.retrievalCache = new Map();
    }

    searchGenes(genes, query, options = {}) {
        const maxResults = options.maxResults || this.config.maxResults;
        const candidates = this.findCandidates(genes, query);
        const scored = this.scoreCandidates(candidates, query);
        const filtered = scored.filter(c => c.relevance >= this.config.minRelevance);
        return filtered
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxResults);
    }

    findCandidates(genes, query) {
        return genes
            .map(gene => {
                const scores = {};
                if (query.type && gene.type === query.type) {
                    scores.typeMatch = 1;
                }
                if (query.minFitness !== undefined && gene.fitness >= query.minFitness) {
                    scores.fitnessMatch = (gene.fitness - query.minFitness) / (1 - query.minFitness);
                }
                if (query.keywords && gene.description) {
                    scores.keywordMatch = this.matchKeywords(gene.description, query.keywords);
                }
                if (query.tags && gene.tags) {
                    scores.tagMatch = this.matchTags(gene.tags, query.tags);
                }
                const relevance = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
                return { gene, scores, relevance };
            })
            .filter(c => c.relevance > 0);
    }

    scoreCandidates(candidates, query) {
        return candidates.map(c => {
            const temporal = this.calculateTemporalScore(c.gene);
            const quality = this.calculateQualityScore(c.gene);
            const finalScore = c.relevance * 0.5 + temporal * 0.3 + quality * 0.2;
            return { ...c, temporal, quality, finalScore };
        });
    }

    matchKeywords(text, keywords) {
        const textLower = text.toLowerCase();
        const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
        const matches = keywordArray.filter(k => textLower.includes(k.toLowerCase()));
        return matches.length / keywordArray.length;
    }

    matchTags(geneTags, queryTags) {
        const geneSet = new Set(geneTags);
        const querySet = new Set(Array.isArray(queryTags) ? queryTags : [queryTags]);
        const intersection = new Set([...geneSet].filter(t => querySet.has(t)));
        return intersection.size / querySet.size;
    }

    calculateTemporalScore(gene) {
        if (!gene.timestamp && !gene.generation) return 0.5;
        const age = gene.generation || this.calculateGenerationAge(gene.timestamp);
        return Math.pow(this.config.temporalDecay, age);
    }

    calculateGenerationAge(timestamp) {
        const age = Date.now() - new Date(timestamp).getTime();
        return Math.floor(age / (24 * 60 * 60 * 1000));
    }

    calculateQualityScore(gene) {
        let score = 0.5;
        if (gene.fitness !== undefined) {
            score += gene.fitness * 0.3;
        }
        if (gene.successRate !== undefined) {
            score += gene.successRate * 0.2;
        }
        return Math.min(1, score);
    }

    findSimilarGenes(genes, targetGene, options = {}) {
        const maxResults = options.maxResults || 10;
        const minSimilarity = options.minSimilarity || 0.5;
        return genes
            .filter(g => g.id !== targetGene.id)
            .map(gene => ({
                gene,
                similarity: this.calculateGeneSimilarity(gene, targetGene)
            }))
            .filter(s => s.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }

    calculateGeneSimilarity(gene1, gene2) {
        let similarity = 0;
        if (gene1.type === gene2.type) similarity += 0.3;
        const genes1 = gene1.genes || {};
        const genes2 = gene2.genes || {};
        const allKeys = new Set([...Object.keys(genes1), ...Object.keys(genes2)]);
        if (allKeys.size > 0) {
            let matchCount = 0;
            for (const key of allKeys) {
                if (JSON.stringify(genes1[key]) === JSON.stringify(genes2[key])) {
                    matchCount++;
                }
            }
            similarity += (matchCount / allKeys.size) * 0.7;
        }
        return similarity;
    }

    getEvolutionHistory(generations, options = {}) {
        const history = [];
        for (const gen of generations) {
            history.push({
                generation: gen.generation,
                bestFitness: gen.bestFitness,
                avgFitness: gen.avgFitness,
                diversity: gen.diversity,
                populationSize: gen.population?.length || 0
            });
        }
        if (options.trend) {
            return this.calculateTrend(history);
        }
        return history;
    }

    calculateTrend(history) {
        if (history.length < 2) {
            return { trend: 'insufficient_data', history };
        }
        const fitnessChanges = [];
        for (let i = 1; i < history.length; i++) {
            fitnessChanges.push(history[i].bestFitness - history[i - 1].bestFitness);
        }
        const avgChange = fitnessChanges.reduce((a, b) => a + b, 0) / fitnessChanges.length;
        let trend = 'stable';
        if (avgChange > 0.01) trend = 'improving';
        else if (avgChange < -0.01) trend = 'declining';
        return {
            trend,
            avgChange,
            history,
            prediction: this.predictNextFitness(history)
        };
    }

    predictNextFitness(history) {
        if (history.length < 3) return null;
        const recent = history.slice(-5);
        const avgGrowth = recent.reduce((sum, h, i) => {
            if (i === 0) return 0;
            return sum + (h.bestFitness - recent[i - 1].bestFitness);
        }, 0) / (recent.length - 1);
        const lastFitness = recent[recent.length - 1].bestFitness;
        return {
            predicted: Math.min(1, lastFitness + avgGrowth),
            confidence: 0.5 + Math.abs(avgGrowth) * 2
        };
    }

    findAncestors(gene, geneMap, depth = 5) {
        const ancestors = [];
        let current = gene;
        for (let i = 0; i < depth; i++) {
            if (!current.parentId) break;
            const parent = geneMap.get(current.parentId);
            if (!parent) break;
            ancestors.push({ generation: i + 1, gene: parent });
            current = parent;
        }
        return ancestors;
    }

    findDescendants(gene, geneMap, depth = 3) {
        const descendants = [];
        const queue = [{ gene, depth: 0 }];
        while (queue.length > 0) {
            const { gene: current, depth } = queue.shift();
            if (depth >= depth) continue;
            for (const [id, g] of geneMap) {
                if (g.parentId === current.id) {
                    descendants.push({ generation: depth + 1, gene: g });
                    queue.push({ gene: g, depth: depth + 1 });
                }
            }
        }
        return descendants;
    }

    getTopPerformers(genes, metric = 'fitness', limit = 10) {
        return [...genes]
            .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
            .slice(0, limit);
    }

    getRecentMutations(genes, days = 7) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return genes
            .filter(g => g.mutatedAt && new Date(g.mutatedAt).getTime() >= cutoff)
            .sort((a, b) => new Date(b.mutatedAt) - new Date(a.mutatedAt));
    }

    clearCache() {
        this.retrievalCache.clear();
    }

    getStats() {
        return {
            cacheSize: this.retrievalCache.size,
            config: this.config
        };
    }
}

export default EvolutionRetrieval;
