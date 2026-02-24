/**
 * 进化系统自动化模块 (P3)
 * 负责自动进化、变异策略、选择机制
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class EvolutionAutomation {
    constructor(config = {}) {
        this.config = {
            autoEvolve: config.autoEvolve ?? true,
            evolutionInterval: config.evolutionInterval ?? 60000,
            mutationStrategies: config.mutationStrategies ?? ['gaussian', 'uniform', 'adaptive'],
            selectionMethod: config.selectionMethod ?? 'tournament',
            crossoverEnabled: config.crossoverEnabled ?? true,
            elitePreservation: config.elitePreservation ?? 0.1,
            mutationRate: config.mutationRate ?? 0.1,
            ...config
        };
        this.evolutionState = {
            currentGeneration: 0,
            isEvolving: false,
            lastEvolution: null
        };
        this.mutationHistory = [];
        this.scheduledTasks = new Map();
        this.hooks = {
            preEvolution: [],
            postEvolution: [],
            preMutation: [],
            postMutation: [],
            preSelection: [],
            postSelection: []
        };
    }

    async initialize() {
        if (this.config.autoEvolve) {
            this.scheduleAutoEvolution();
        }
    }

    scheduleAutoEvolution() {
        const taskId = 'auto-evolution';
        const timer = setInterval(() => {
            this.triggerEvolution();
        }, this.config.evolutionInterval);
        this.scheduledTasks.set(taskId, { timer, interval: this.config.evolutionInterval });
        return { scheduled: true, taskId, interval: this.config.evolutionInterval };
    }

    cancelAutoEvolution() {
        const task = this.scheduledTasks.get('auto-evolution');
        if (task) {
            clearInterval(task.timer);
            this.scheduledTasks.delete('auto-evolution');
            return { cancelled: true };
        }
        return { cancelled: false };
    }

    registerHook(event, callback) {
        if (!this.hooks[event]) {
            this.hooks[event] = [];
        }
        this.hooks[event].push(callback);
    }

    async triggerHooks(event, data) {
        const callbacks = this.hooks[event] || [];
        const results = [];
        for (const callback of callbacks) {
            try {
                const result = await callback(data);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    async triggerEvolution() {
        if (this.evolutionState.isEvolving) {
            return { success: false, reason: 'already_evolving' };
        }
        this.evolutionState.isEvolving = true;
        try {
            await this.triggerHooks('preEvolution', this.evolutionState);
            this.evolutionState.currentGeneration++;
            this.evolutionState.lastEvolution = new Date().toISOString();
            await this.triggerHooks('postEvolution', this.evolutionState);
            return { success: true, generation: this.evolutionState.currentGeneration };
        } finally {
            this.evolutionState.isEvolving = false;
        }
    }

    mutate(gene, strategy = null) {
        const selectedStrategy = strategy || this.selectMutationStrategy();
        let mutatedGene;
        switch (selectedStrategy) {
            case 'gaussian':
                mutatedGene = this.gaussianMutation(gene);
                break;
            case 'uniform':
                mutatedGene = this.uniformMutation(gene);
                break;
            case 'adaptive':
                mutatedGene = this.adaptiveMutation(gene);
                break;
            default:
                mutatedGene = this.uniformMutation(gene);
        }
        mutatedGene.id = this.generateMutantId(gene.id);
        mutatedGene.parentId = gene.id;
        mutatedGene.mutatedAt = new Date().toISOString();
        mutatedGene.mutationStrategy = selectedStrategy;
        this.recordMutation(gene, mutatedGene, selectedStrategy);
        return mutatedGene;
    }

    selectMutationStrategy() {
        const strategies = this.config.mutationStrategies;
        return strategies[Math.floor(Math.random() * strategies.length)];
    }

    gaussianMutation(gene) {
        const mutated = JSON.parse(JSON.stringify(gene));
        const genes = mutated.genes || {};
        for (const key of Object.keys(genes)) {
            if (typeof genes[key] === 'number') {
                const noise = this.gaussianRandom() * this.config.mutationRate;
                genes[key] = genes[key] * (1 + noise);
            }
        }
        return mutated;
    }

    uniformMutation(gene) {
        const mutated = JSON.parse(JSON.stringify(gene));
        const genes = mutated.genes || {};
        for (const key of Object.keys(genes)) {
            if (typeof genes[key] === 'number') {
                if (Math.random() < this.config.mutationRate) {
                    genes[key] = genes[key] + (Math.random() - 0.5) * 0.2;
                }
            }
        }
        return mutated;
    }

    adaptiveMutation(gene) {
        const fitness = gene.fitness || 0.5;
        const adaptiveRate = this.config.mutationRate * (1 - fitness);
        const mutated = JSON.parse(JSON.stringify(gene));
        const genes = mutated.genes || {};
        for (const key of Object.keys(genes)) {
            if (typeof genes[key] === 'number') {
                if (Math.random() < adaptiveRate) {
                    genes[key] = genes[key] + (Math.random() - 0.5) * adaptiveRate;
                }
            }
        }
        return mutated;
    }

    gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    crossover(parent1, parent2) {
        if (!this.config.crossoverEnabled) {
            return [parent1, parent2];
        }
        const child1 = JSON.parse(JSON.stringify(parent1));
        const child2 = JSON.parse(JSON.stringify(parent2));
        const genes1 = child1.genes || {};
        const genes2 = child2.genes || {};
        const allKeys = [...new Set([...Object.keys(genes1), ...Object.keys(genes2)])];
        for (const key of allKeys) {
            if (Math.random() < 0.5) {
                const temp = genes1[key];
                genes1[key] = genes2[key];
                genes2[key] = temp;
            }
        }
        child1.id = this.generateMutantId(parent1.id);
        child2.id = this.generateMutantId(parent2.id);
        child1.parentId = parent1.id;
        child2.parentId = parent2.id;
        child1.createdAt = new Date().toISOString();
        child2.createdAt = new Date().toISOString();
        return [child1, child2];
    }

    select(population, count) {
        switch (this.config.selectionMethod) {
            case 'tournament':
                return this.tournamentSelection(population, count);
            case 'roulette':
                return this.rouletteSelection(population, count);
            case 'rank':
                return this.rankSelection(population, count);
            default:
                return this.tournamentSelection(population, count);
        }
    }

    tournamentSelection(population, count, tournamentSize = 3) {
        const selected = [];
        for (let i = 0; i < count; i++) {
            const tournament = [];
            for (let j = 0; j < tournamentSize; j++) {
                const idx = Math.floor(Math.random() * population.length);
                tournament.push(population[idx]);
            }
            tournament.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
            selected.push(tournament[0]);
        }
        return selected;
    }

    rouletteSelection(population, count) {
        const totalFitness = population.reduce((sum, ind) => sum + (ind.fitness || 0), 0);
        if (totalFitness === 0) {
            return population.slice(0, count);
        }
        const selected = [];
        for (let i = 0; i < count; i++) {
            let threshold = Math.random() * totalFitness;
            for (const ind of population) {
                threshold -= ind.fitness || 0;
                if (threshold <= 0) {
                    selected.push(ind);
                    break;
                }
            }
        }
        return selected;
    }

    rankSelection(population, count) {
        const sorted = [...population].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
        const selected = [];
        for (let i = 0; i < count; i++) {
            const rank = Math.floor(Math.pow(Math.random(), 2) * sorted.length);
            selected.push(sorted[rank]);
        }
        return selected;
    }

    generateMutantId(parentId) {
        const random = crypto.randomBytes(4).toString('hex');
        return `${parentId}_m${random}`;
    }

    recordMutation(original, mutated, strategy) {
        this.mutationHistory.push({
            originalId: original.id,
            mutatedId: mutated.id,
            strategy,
            timestamp: new Date().toISOString(),
            generation: this.evolutionState.currentGeneration
        });
        if (this.mutationHistory.length > 1000) {
            this.mutationHistory = this.mutationHistory.slice(-500);
        }
    }

    getMutationStats() {
        if (this.mutationHistory.length === 0) {
            return { total: 0, byStrategy: {} };
        }
        const byStrategy = {};
        for (const record of this.mutationHistory) {
            byStrategy[record.strategy] = (byStrategy[record.strategy] || 0) + 1;
        }
        return {
            total: this.mutationHistory.length,
            byStrategy,
            recent: this.mutationHistory.slice(-10)
        };
    }

    getStats() {
        return {
            evolutionState: this.evolutionState,
            config: {
                autoEvolve: this.config.autoEvolve,
                mutationRate: this.config.mutationRate,
                selectionMethod: this.config.selectionMethod,
                crossoverEnabled: this.config.crossoverEnabled
            },
            mutationStats: this.getMutationStats(),
            scheduledTasks: this.scheduledTasks.size,
            hooks: Object.keys(this.hooks).reduce((acc, key) => {
                acc[key] = this.hooks[key].length;
                return acc;
            }, {})
        };
    }
}

export default EvolutionAutomation;
