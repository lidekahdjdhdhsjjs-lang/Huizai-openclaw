/**
 * 进化系统性能模块 (P0)
 * 负责进化计算优化、并行处理、缓存和资源管理
 */

export class EvolutionPerformance {
    constructor(config = {}) {
        this.config = {
            populationCacheSize: config.populationCacheSize ?? 100,
            fitnessCacheEnabled: config.fitnessCacheEnabled ?? true,
            parallelEvaluations: config.parallelEvaluations ?? 4,
            adaptiveMutationRate: config.adaptiveMutationRate ?? true,
            elitismRate: config.elitismRate ?? 0.1,
            maxGenerationTime: config.maxGenerationTime ?? 60000,
            resourceLimits: config.resourceLimits ?? {
                maxMemory: 512 * 1024 * 1024,
                maxCpuPercent: 80
            },
            ...config
        };
        this.populationCache = new Map();
        this.fitnessCache = new Map();
        this.generationStats = [];
        this.currentGeneration = 0;
        this.metrics = {
            totalEvaluations: 0,
            cachedEvaluations: 0,
            avgFitness: 0,
            bestFitness: 0,
            convergenceRate: 0
        };
    }

    cachePopulation(generation, population) {
        if (this.populationCache.size >= this.config.populationCacheSize) {
            const oldestKey = this.populationCache.keys().next().value;
            this.populationCache.delete(oldestKey);
        }
        this.populationCache.set(generation, {
            population,
            timestamp: Date.now(),
            stats: this.calculatePopulationStats(population)
        });
    }

    getCachedPopulation(generation) {
        return this.populationCache.get(generation)?.population || null;
    }

    cacheFitness(individualId, fitness) {
        if (!this.config.fitnessCacheEnabled) return;
        this.fitnessCache.set(individualId, {
            fitness,
            timestamp: Date.now()
        });
    }

    getCachedFitness(individualId) {
        if (!this.config.fitnessCacheEnabled) return null;
        const cached = this.fitnessCache.get(individualId);
        return cached?.fitness || null;
    }

    async evaluatePopulationParallel(population, fitnessFunction) {
        const batchSize = this.config.parallelEvaluations;
        const results = [];
        for (let i = 0; i < population.length; i += batchSize) {
            const batch = population.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (individual) => {
                    const cached = this.getCachedFitness(individual.id);
                    if (cached !== null) {
                        this.metrics.cachedEvaluations++;
                        return { individual, fitness: cached, cached: true };
                    }
                    const fitness = await fitnessFunction(individual);
                    this.cacheFitness(individual.id, fitness);
                    this.metrics.totalEvaluations++;
                    return { individual, fitness, cached: false };
                })
            );
            results.push(...batchResults);
        }
        return results;
    }

    selectElite(population, fitnessResults) {
        const sorted = [...fitnessResults].sort((a, b) => b.fitness - a.fitness);
        const eliteCount = Math.ceil(population.length * this.config.elitismRate);
        return sorted.slice(0, eliteCount).map(r => r.individual);
    }

    calculateAdaptiveMutationRate(generation, history) {
        if (!this.config.adaptiveMutationRate) {
            return 0.1;
        }
        if (history.length < 3) {
            return 0.2;
        }
        const recent = history.slice(-5);
        const improvements = recent.filter((h, i) => 
            i > 0 && h.bestFitness > recent[i - 1].bestFitness
        ).length;
        const improvementRate = improvements / (recent.length - 1);
        if (improvementRate < 0.2) {
            return Math.min(0.5, 0.2 + (1 - improvementRate) * 0.3);
        }
        return Math.max(0.05, 0.1 - improvementRate * 0.05);
    }

    calculatePopulationStats(population) {
        if (population.length === 0) {
            return { avgFitness: 0, bestFitness: 0, worstFitness: 0, diversity: 0 };
        }
        const fitnesses = population.map(ind => ind.fitness || 0);
        const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
        const bestFitness = Math.max(...fitnesses);
        const worstFitness = Math.min(...fitnesses);
        const diversity = this.calculateDiversity(population);
        return { avgFitness, bestFitness, worstFitness, diversity };
    }

    calculateDiversity(population) {
        if (population.length < 2) return 1;
        let totalDistance = 0;
        let comparisons = 0;
        for (let i = 0; i < Math.min(population.length, 20); i++) {
            for (let j = i + 1; j < Math.min(population.length, 20); j++) {
                totalDistance += this.calculateIndividualDistance(population[i], population[j]);
                comparisons++;
            }
        }
        return comparisons > 0 ? totalDistance / comparisons : 0;
    }

    calculateIndividualDistance(ind1, ind2) {
        const genes1 = ind1.genes || {};
        const genes2 = ind2.genes || {};
        const allKeys = new Set([...Object.keys(genes1), ...Object.keys(genes2)]);
        let distance = 0;
        for (const key of allKeys) {
            if (genes1[key] !== genes2[key]) {
                distance += 1;
            }
        }
        return allKeys.size > 0 ? distance / allKeys.size : 0;
    }

    recordGeneration(generation, population, duration) {
        const stats = this.calculatePopulationStats(population);
        this.generationStats.push({
            generation,
            ...stats,
            duration,
            timestamp: Date.now()
        });
        this.metrics.avgFitness = stats.avgFitness;
        this.metrics.bestFitness = stats.bestFitness;
        if (this.generationStats.length >= 2) {
            const prev = this.generationStats[this.generationStats.length - 2];
            this.metrics.convergenceRate = prev.bestFitness > 0 
                ? (stats.bestFitness - prev.bestFitness) / prev.bestFitness 
                : 0;
        }
        this.currentGeneration = generation;
        this.cachePopulation(generation, population);
    }

    getProgressReport() {
        if (this.generationStats.length === 0) {
            return { status: 'not_started' };
        }
        const recent = this.generationStats.slice(-10);
        const avgDuration = recent.reduce((sum, g) => sum + g.duration, 0) / recent.length;
        const avgImprovement = recent.reduce((sum, g) => sum + Math.max(0, g.bestFitness), 0) / recent.length;
        return {
            currentGeneration: this.currentGeneration,
            totalEvaluations: this.metrics.totalEvaluations,
            cachedEvaluations: this.metrics.cachedEvaluations,
            cacheHitRate: this.metrics.totalEvaluations > 0 
                ? this.metrics.cachedEvaluations / (this.metrics.totalEvaluations + this.metrics.cachedEvaluations)
                : 0,
            avgFitness: this.metrics.avgFitness,
            bestFitness: this.metrics.bestFitness,
            convergenceRate: this.metrics.convergenceRate,
            avgGenerationDuration: avgDuration,
            trend: this.calculateTrend()
        };
    }

    calculateTrend() {
        if (this.generationStats.length < 3) return 'insufficient_data';
        const recent = this.generationStats.slice(-5);
        let improving = 0;
        for (let i = 1; i < recent.length; i++) {
            if (recent[i].bestFitness > recent[i - 1].bestFitness) {
                improving++;
            }
        }
        const improvementRatio = improving / (recent.length - 1);
        if (improvementRatio > 0.7) return 'improving';
        if (improvementRatio < 0.3) return 'stagnating';
        return 'stable';
    }

    optimizeForResourceUsage() {
        const memUsage = process.memoryUsage();
        const recommendations = [];
        if (memUsage.heapUsed > this.config.resourceLimits.maxMemory * 0.8) {
            recommendations.push({
                type: 'memory',
                action: 'clear_cache',
                message: 'Memory usage high, consider clearing caches'
            });
            this.fitnessCache.clear();
        }
        if (this.populationCache.size > this.config.populationCacheSize * 0.9) {
            recommendations.push({
                type: 'cache',
                action: 'reduce_population_cache',
                message: 'Population cache nearly full'
            });
        }
        return recommendations;
    }

    clearCaches() {
        this.populationCache.clear();
        this.fitnessCache.clear();
        return { cleared: true };
    }

    getStats() {
        return {
            config: {
                populationCacheSize: this.config.populationCacheSize,
                fitnessCacheEnabled: this.config.fitnessCacheEnabled,
                parallelEvaluations: this.config.parallelEvaluations,
                elitismRate: this.config.elitismRate
            },
            cacheStats: {
                populationCacheSize: this.populationCache.size,
                fitnessCacheSize: this.fitnessCache.size
            },
            metrics: this.metrics,
            generations: this.generationStats.length,
            progress: this.getProgressReport()
        };
    }
}

export default EvolutionPerformance;
