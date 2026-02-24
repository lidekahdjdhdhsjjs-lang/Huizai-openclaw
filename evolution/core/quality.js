/**
 * 进化系统质量控制模块 (P1)
 * 负责适应度评估、基因质量检查、进化约束
 */

import crypto from 'crypto';

export class EvolutionQuality {
    constructor(config = {}) {
        this.config = {
            fitnessThresholds: config.fitnessThresholds ?? {
                excellent: 0.9,
                good: 0.7,
                acceptable: 0.5,
                poor: 0.3
            },
            qualityWeights: config.qualityWeights ?? {
                performance: 0.4,
                stability: 0.3,
                efficiency: 0.2,
                novelty: 0.1
            },
            penaltyFactors: config.penaltyFactors ?? {
                complexityPenalty: 0.1,
                resourceAbusePenalty: 0.2,
                errorPenalty: 0.5
            },
            diversityWeight: config.diversityWeight ?? 0.2,
            ...config
        };
        this.qualityHistory = new Map();
        this.fitnessLandscape = new Map();
    }

    evaluateFitness(individual, evaluationResults) {
        const weights = this.config.qualityWeights;
        let fitness = 0;
        if (evaluationResults.performance !== undefined) {
            fitness += evaluationResults.performance * weights.performance;
        }
        if (evaluationResults.stability !== undefined) {
            fitness += evaluationResults.stability * weights.stability;
        }
        if (evaluationResults.efficiency !== undefined) {
            fitness += evaluationResults.efficiency * weights.efficiency;
        }
        if (evaluationResults.novelty !== undefined) {
            fitness += evaluationResults.novelty * weights.novelty;
        }
        fitness = this.applyPenalties(fitness, individual, evaluationResults);
        fitness = Math.max(0, Math.min(1, fitness));
        return {
            fitness,
            components: {
                performance: evaluationResults.performance || 0,
                stability: evaluationResults.stability || 0,
                efficiency: evaluationResults.efficiency || 0,
                novelty: evaluationResults.novelty || 0
            },
            penalties: this.identifyPenalties(individual, evaluationResults)
        };
    }

    applyPenalties(fitness, individual, results) {
        const penalties = this.config.penaltyFactors;
        if (individual.complexity && individual.complexity > 0.7) {
            fitness *= (1 - penalties.complexityPenalty);
        }
        if (results.resourceUsage && results.resourceUsage > 0.8) {
            fitness *= (1 - penalties.resourceAbusePenalty);
        }
        if (results.errors && results.errors.length > 0) {
            const errorPenalty = Math.min(penalties.errorPenalty, results.errors.length * 0.1);
            fitness *= (1 - errorPenalty);
        }
        return fitness;
    }

    identifyPenalties(individual, results) {
        const penalties = [];
        if (individual.complexity && individual.complexity > 0.7) {
            penalties.push({ type: 'complexity', severity: 'medium' });
        }
        if (results.resourceUsage && results.resourceUsage > 0.8) {
            penalties.push({ type: 'resource_abuse', severity: 'high' });
        }
        if (results.errors && results.errors.length > 0) {
            penalties.push({ type: 'errors', severity: results.errors.length > 3 ? 'high' : 'low', count: results.errors.length });
        }
        return penalties;
    }

    classifyByFitness(fitness) {
        const thresholds = this.config.fitnessThresholds;
        if (fitness >= thresholds.excellent) return 'excellent';
        if (fitness >= thresholds.good) return 'good';
        if (fitness >= thresholds.acceptable) return 'acceptable';
        if (fitness >= thresholds.poor) return 'poor';
        return 'unfit';
    }

    calculateGeneQuality(gene) {
        const factors = [];
        let qualityScore = 0.5;
        if (gene.successCount && gene.totalAttempts) {
            const successRate = gene.successCount / gene.totalAttempts;
            qualityScore += successRate * 0.3;
            factors.push({ factor: 'success_rate', value: successRate });
        }
        if (gene.age) {
            const ageQuality = Math.max(0, 1 - gene.age / 100);
            qualityScore += ageQuality * 0.1;
            factors.push({ factor: 'age', value: ageQuality });
        }
        if (gene.complexity !== undefined) {
            const complexityQuality = 1 - gene.complexity;
            qualityScore += complexityQuality * 0.1;
            factors.push({ factor: 'complexity', value: complexityQuality });
        }
        return {
            qualityScore: Math.min(1, qualityScore),
            classification: this.classifyByFitness(qualityScore),
            factors
        };
    }

    validateGeneForEvolution(gene) {
        const errors = [];
        const warnings = [];
        if (!gene.id) {
            errors.push('Missing gene id');
        }
        if (!gene.type) {
            errors.push('Missing gene type');
        }
        if (gene.value === undefined && !gene.code) {
            warnings.push('Gene has neither value nor code');
        }
        if (gene.mutationRate !== undefined && (gene.mutationRate < 0 || gene.mutationRate > 1)) {
            errors.push('Mutation rate must be between 0 and 1');
        }
        const quality = this.calculateGeneQuality(gene);
        if (quality.classification === 'unfit') {
            warnings.push('Gene quality is below acceptable threshold');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            quality
        };
    }

    calculatePopulationDiversity(population) {
        if (population.length < 2) return 1;
        const geneKeys = new Set();
        for (const individual of population) {
            const genes = individual.genes || {};
            Object.keys(genes).forEach(key => geneKeys.add(key));
        }
        if (geneKeys.size === 0) return 1;
        let totalDiversity = 0;
        for (const key of geneKeys) {
            const values = new Set();
            for (const individual of population) {
                const genes = individual.genes || {};
                if (genes[key] !== undefined) {
                    values.add(JSON.stringify(genes[key]));
                }
            }
            totalDiversity += values.size / population.length;
        }
        return totalDiversity / geneKeys.size;
    }

    assessEvolutionProgress(generationHistory) {
        if (generationHistory.length < 2) {
            return { progress: 'insufficient_data', recommendation: 'Continue evolution' };
        }
        const recent = generationHistory.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const improvement = last.bestFitness - first.bestFitness;
        const diversityTrend = last.diversity - first.diversity;
        let status = 'stable';
        let recommendation = '';
        if (improvement > 0.1) {
            status = 'improving';
            recommendation = 'Continue current strategy';
        } else if (improvement < -0.05) {
            status = 'degrading';
            recommendation = 'Consider increasing diversity or mutation rate';
        } else if (diversityTrend < -0.2) {
            status = 'converging';
            recommendation = 'Increase diversity to avoid local optima';
        } else {
            recommendation = 'Monitor for stagnation';
        }
        return {
            progress: status,
            improvement,
            diversityTrend,
            recommendation,
            stats: {
                bestFitness: last.bestFitness,
                avgFitness: last.avgFitness,
                diversity: last.diversity
            }
        };
    }

    recordQualityHistory(individualId, fitness, metadata = {}) {
        if (!this.qualityHistory.has(individualId)) {
            this.qualityHistory.set(individualId, []);
        }
        this.qualityHistory.get(individualId).push({
            fitness,
            timestamp: Date.now(),
            ...metadata
        });
    }

    getQualityTrend(individualId) {
        const history = this.qualityHistory.get(individualId);
        if (!history || history.length < 2) {
            return { trend: 'insufficient_data' };
        }
        const recent = history.slice(-5);
        const first = recent[0].fitness;
        const last = recent[recent.length - 1].fitness;
        const trend = last > first ? 'improving' : last < first ? 'declining' : 'stable';
        return {
            trend,
            change: last - first,
            history: recent
        };
    }

    updateFitnessLandscape(geneKey, value, fitness) {
        if (!this.fitnessLandscape.has(geneKey)) {
            this.fitnessLandscape.set(geneKey, new Map());
        }
        const valueMap = this.fitnessLandscape.get(geneKey);
        const existing = valueMap.get(value) || { totalFitness: 0, count: 0 };
        existing.totalFitness += fitness;
        existing.count++;
        existing.avgFitness = existing.totalFitness / existing.count;
        valueMap.set(value, existing);
    }

    getFitnessLandscapeAnalysis(geneKey) {
        const valueMap = this.fitnessLandscape.get(geneKey);
        if (!valueMap) {
            return { geneKey, analysis: 'no_data' };
        }
        const analysis = [];
        for (const [value, data] of valueMap.entries()) {
            analysis.push({ value, avgFitness: data.avgFitness, samples: data.count });
        }
        analysis.sort((a, b) => b.avgFitness - a.avgFitness);
        return {
            geneKey,
            topValues: analysis.slice(0, 5),
            totalValues: analysis.length
        };
    }

    getStats() {
        return {
            fitnessThresholds: this.config.fitnessThresholds,
            qualityWeights: this.config.qualityWeights,
            historySize: this.qualityHistory.size,
            landscapeSize: this.fitnessLandscape.size
        };
    }
}

export default EvolutionQuality;
