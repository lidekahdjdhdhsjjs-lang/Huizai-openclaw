/**
 * 进化系统管理器 - 统一入口
 * 整合所有进化模块提供统一API
 */

import EvolutionSecurity from './security.js';
import EvolutionPerformance from './performance.js';
import EvolutionQuality from './quality.js';
import EvolutionIndexer from './indexer.js';
import EvolutionRetrieval from './retrieval.js';
import EvolutionLifecycle from './lifecycle.js';
import EvolutionAutomation from './automation.js';
import EvolutionIntegration from './integration.js';
import fs from 'fs/promises';
import path from 'path';

export class EvolutionManager {
    constructor(config = {}) {
        this.config = {
            evolutionPath: config.evolutionPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'workspace', 'evolution'),
            populationSize: config.populationSize ?? 100,
            ...config
        };
        this.security = new EvolutionSecurity(config.security);
        this.performance = new EvolutionPerformance(config.performance);
        this.quality = new EvolutionQuality(config.quality);
        this.indexer = new EvolutionIndexer(config.indexer);
        this.retrieval = new EvolutionRetrieval(config.retrieval);
        this.lifecycle = new EvolutionLifecycle(config.lifecycle);
        this.automation = new EvolutionAutomation(config.automation);
        this.integration = new EvolutionIntegration(config.integration);
        this.population = [];
        this.generation = 0;
        this.initialized = false;
    }

    async initialize() {
        await this.indexer.initialize();
        await this.automation.initialize();
        await this.integration.initialize();
        await this.loadState();
        this.initialized = true;
        return { success: true, message: 'Evolution manager initialized' };
    }

    async loadState() {
        const state = await this.integration.loadEvolutionState();
        if (state) {
            this.population = state.population || [];
            this.generation = state.generation || 0;
            await this.indexer.buildGeneIndex(this.population);
            return { loaded: true, populationSize: this.population.length };
        }
        return { loaded: false };
    }

    async saveState() {
        await this.integration.saveEvolutionState({
            population: this.population,
            generation: this.generation,
            savedAt: new Date().toISOString()
        });
        return { saved: true };
    }

    async addGene(gene) {
        const validation = this.security.validateGene(gene);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        gene.id = gene.id || this.generateGeneId();
        gene.generation = this.generation;
        gene.timestamp = new Date().toISOString();
        const registration = this.security.registerGene(gene);
        if (!registration.success) {
            return { success: false, errors: registration.errors };
        }
        this.population.push(gene);
        this.indexer.indexGene(gene);
        return { success: true, gene };
    }

    async getGene(id) {
        return this.population.find(g => g.id === id) || null;
    }

    async updateGene(id, updates) {
        const idx = this.population.findIndex(g => g.id === id);
        if (idx === -1) {
            return { success: false, error: 'Gene not found' };
        }
        const mutationValidation = this.security.validateMutation(this.population[idx], updates);
        if (!mutationValidation.valid) {
            return { success: false, error: mutationValidation.reason };
        }
        this.population[idx] = { ...this.population[idx], ...updates, updatedAt: new Date().toISOString() };
        return { success: true, gene: this.population[idx] };
    }

    async deleteGene(id) {
        const idx = this.population.findIndex(g => g.id === id);
        if (idx === -1) {
            return { success: false, error: 'Gene not found' };
        }
        this.population.splice(idx, 1);
        this.indexer.removeFromIndex?.(id);
        return { success: true };
    }

    async evaluateGene(gene, evaluationFunction) {
        const cached = this.performance.getCachedFitness(gene.id);
        if (cached !== null) {
            return { fitness: cached, cached: true };
        }
        const results = await evaluationFunction(gene);
        const fitnessResult = this.quality.evaluateFitness(gene, results);
        this.performance.cacheFitness(gene.id, fitnessResult.fitness);
        gene.fitness = fitnessResult.fitness;
        this.quality.recordQualityHistory(gene.id, fitnessResult.fitness);
        return { ...fitnessResult, cached: false };
    }

    async evaluatePopulation(evaluationFunction) {
        const results = await this.performance.evaluatePopulationParallel(this.population, 
            (gene) => this.evaluateGene(gene, evaluationFunction)
        );
        this.performance.recordGeneration(this.generation, this.population, 0);
        return results;
    }

    async evolve(evaluationFunction, options = {}) {
        await this.automation.triggerHooks('preEvolution', { generation: this.generation });
        const rollbackPoint = await this.security.saveRollbackPoint(this.population);
        try {
            const fitnessResults = await this.evaluatePopulation(evaluationFunction);
            const elite = this.performance.selectElite(this.population, fitnessResults);
            const parents = this.automation.select(this.population, Math.floor(this.population.length * 0.5));
            const offspring = [];
            for (let i = 0; i < parents.length - 1; i += 2) {
                const [child1, child2] = this.automation.crossover(parents[i], parents[i + 1]);
                const mutated1 = this.automation.mutate(child1);
                const mutated2 = this.automation.mutate(child2);
                offspring.push(mutated1, mutated2);
            }
            this.generation++;
            const managed = this.lifecycle.managePopulation(elite, offspring);
            this.population = managed.population;
            await this.indexer.buildGeneIndex(this.population);
            this.indexer.indexGeneration(this.generation, this.population);
            await this.saveState();
            await this.automation.triggerHooks('postEvolution', { generation: this.generation, populationSize: this.population.length });
            return {
                generation: this.generation,
                populationSize: this.population.length,
                eliteCount: elite.length,
                offspringCount: offspring.length,
                removedCount: managed.removed.length
            };
        } catch (error) {
            if (rollbackPoint) {
                const rollback = await this.security.rollback(rollbackPoint.id);
                if (rollback.success) {
                    this.population = rollback.genes;
                }
            }
            throw error;
        }
    }

    async searchGenes(query, options = {}) {
        return this.retrieval.searchGenes(this.population, query, options);
    }

    async findSimilarGenes(id, options = {}) {
        const gene = await this.getGene(id);
        if (!gene) {
            return { error: 'Gene not found' };
        }
        return this.retrieval.findSimilarGenes(this.population, gene, options);
    }

    async getLineage(id, depth = 5) {
        const geneMap = new Map(this.population.map(g => [g.id, g]));
        const gene = geneMap.get(id);
        if (!gene) {
            return { error: 'Gene not found' };
        }
        return {
            gene,
            ancestors: this.retrieval.findAncestors(gene, geneMap, depth),
            descendants: this.retrieval.findDescendants(gene, geneMap, depth)
        };
    }

    async getTopPerformers(metric = 'fitness', limit = 10) {
        return this.retrieval.getTopPerformers(this.population, metric, limit);
    }

    async cleanup(options = {}) {
        const results = await this.lifecycle.cleanup(this.population, options);
        if (results.retained) {
            this.population = results.retained.map(r => r.gene);
        }
        await this.indexer.buildGeneIndex(this.population);
        await this.saveState();
        return results;
    }

    async sync() {
        const foundrySync = await this.integration.syncWithFoundry(this.population, {});
        const memorySync = await this.integration.syncWithMemory(this.population);
        return { foundry: foundrySync, memory: memorySync };
    }

    async exportPopulation(format = 'json', options = {}) {
        return this.integration.exportPopulation(this.population, format, options);
    }

    async importPopulation(filePath, options = {}) {
        const results = await this.integration.importPopulation(filePath, options);
        if (results.population) {
            for (const gene of results.population) {
                await this.addGene(gene);
            }
        }
        return results;
    }

    generateGeneId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `gene_${timestamp}_${random}`;
    }

    getStats() {
        return {
            populationSize: this.population.length,
            generation: this.generation,
            initialized: this.initialized,
            performance: this.performance.getStats(),
            quality: this.quality.getStats(),
            indexer: this.indexer.getStats(),
            automation: this.automation.getStats(),
            lifecycle: this.lifecycle.getStats(),
            integration: this.integration.getStats(),
            security: this.security.getStats()
        };
    }

    getHealthReport() {
        const stats = this.getStats();
        const issues = [];
        if (stats.performance.progress.convergenceRate < -0.1) {
            issues.push({ type: 'evolution', message: 'Evolution is regressing', severity: 'warning' });
        }
        if (stats.performance.progress.trend === 'stagnating') {
            issues.push({ type: 'evolution', message: 'Evolution is stagnating', severity: 'info' });
        }
        if (stats.populationSize === 0) {
            issues.push({ type: 'population', message: 'Population is empty', severity: 'critical' });
        }
        return {
            status: issues.length === 0 ? 'healthy' : issues.some(i => i.severity === 'critical') ? 'critical' : 'warning',
            issues,
            stats
        };
    }
}

export default EvolutionManager;
