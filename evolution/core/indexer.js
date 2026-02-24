/**
 * 进化系统索引模块 (P1)
 * 负责基因索引、进化历史索引、适应度景观索引
 */

import fs from 'fs/promises';
import path from 'path';

export class EvolutionIndexer {
    constructor(config = {}) {
        this.config = {
            indexPath: config.indexPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'indices', 'evolution'),
            indexDepth: config.indexDepth ?? 3,
            ...config
        };
        this.geneIndex = new Map();
        this.generationIndex = new Map();
        this.fitnessIndex = new Map();
        this.lineageIndex = new Map();
        this.metadata = {
            lastIndexBuild: null,
            totalGenes: 0,
            totalGenerations: 0
        };
    }

    async initialize() {
        await fs.mkdir(this.config.indexPath, { recursive: true });
    }

    buildGeneIndex(genes) {
        this.geneIndex.clear();
        for (const gene of genes) {
            this.indexGene(gene);
        }
        this.metadata.totalGenes = genes.length;
        this.metadata.lastIndexBuild = new Date().toISOString();
    }

    indexGene(gene) {
        if (!gene.id) return;
        this.indexByType(gene);
        this.indexByFitness(gene);
        this.indexByAge(gene);
        this.indexByParent(gene);
    }

    indexByType(gene) {
        const type = gene.type || 'unknown';
        if (!this.geneIndex.has('byType')) {
            this.geneIndex.set('byType', new Map());
        }
        const typeMap = this.geneIndex.get('byType');
        if (!typeMap.has(type)) {
            typeMap.set(type, []);
        }
        typeMap.get(type).push(gene.id);
    }

    indexByFitness(gene) {
        const fitness = gene.fitness || 0;
        const bucket = this.getFitnessBucket(fitness);
        if (!this.fitnessIndex.has(bucket)) {
            this.fitnessIndex.set(bucket, []);
        }
        this.fitnessIndex.get(bucket).push(gene.id);
    }

    getFitnessBucket(fitness) {
        if (fitness >= 0.9) return 'excellent';
        if (fitness >= 0.7) return 'good';
        if (fitness >= 0.5) return 'acceptable';
        if (fitness >= 0.3) return 'poor';
        return 'unfit';
    }

    indexByAge(gene) {
        const age = gene.generation || 0;
        const ageBucket = this.getAgeBucket(age);
        if (!this.geneIndex.has('byAge')) {
            this.geneIndex.set('byAge', new Map());
        }
        const ageMap = this.geneIndex.get('byAge');
        if (!ageMap.has(ageBucket)) {
            ageMap.set(ageBucket, []);
        }
        ageMap.get(ageBucket).push(gene.id);
    }

    getAgeBucket(age) {
        if (age <= 5) return 'new';
        if (age <= 20) return 'young';
        if (age <= 50) return 'mature';
        return 'ancient';
    }

    indexByParent(gene) {
        if (!gene.parentId) return;
        if (!this.lineageIndex.has(gene.parentId)) {
            this.lineageIndex.set(gene.parentId, []);
        }
        this.lineageIndex.get(gene.parentId).push(gene.id);
    }

    indexGeneration(generation, population) {
        const stats = this.calculateGenerationStats(population);
        this.generationIndex.set(generation, {
            populationSize: population.length,
            ...stats,
            indexedAt: new Date().toISOString()
        });
        this.metadata.totalGenerations = Math.max(this.metadata.totalGenerations, generation);
    }

    calculateGenerationStats(population) {
        const fitnesses = population.map(ind => ind.fitness || 0);
        return {
            bestFitness: Math.max(...fitnesses),
            avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
            worstFitness: Math.min(...fitnesses),
            diversity: this.calculateDiversity(population)
        };
    }

    calculateDiversity(population) {
        if (population.length < 2) return 1;
        const uniqueFitnesses = new Set(fitnesses.map(f => Math.round(f * 100) / 100));
        return uniqueFitnesses.size / population.length;
    }

    queryByType(type) {
        const typeMap = this.geneIndex.get('byType');
        if (!typeMap) return [];
        return typeMap.get(type) || [];
    }

    queryByFitness(minFitness, maxFitness = 1) {
        const results = [];
        const buckets = ['excellent', 'good', 'acceptable', 'poor', 'unfit'];
        const thresholdBuckets = {
            excellent: 0.9,
            good: 0.7,
            acceptable: 0.5,
            poor: 0.3,
            unfit: 0
        };
        for (const bucket of buckets) {
            if (thresholdBuckets[bucket] >= minFitness && thresholdBuckets[bucket] <= maxFitness) {
                results.push(...(this.fitnessIndex.get(bucket) || []));
            }
        }
        return results;
    }

    queryByAge(ageBucket) {
        const ageMap = this.geneIndex.get('byAge');
        if (!ageMap) return [];
        return ageMap.get(ageBucket) || [];
    }

    getLineage(geneId, depth = 3) {
        const lineage = { ancestors: [], descendants: [] };
        let current = geneId;
        for (let i = 0; i < depth; i++) {
            const parentInfo = this.findParent(current);
            if (parentInfo) {
                lineage.ancestors.push(parentInfo);
                current = parentInfo.id;
            } else {
                break;
            }
        }
        lineage.descendants = this.getDescendants(geneId, depth);
        return lineage;
    }

    findParent(geneId) {
        for (const [parentId, children] of this.lineageIndex.entries()) {
            if (children.includes(geneId)) {
                return { id: parentId, relation: 'parent' };
            }
        }
        return null;
    }

    getDescendants(geneId, depth = 3) {
        const descendants = [];
        const queue = [{ id: geneId, depth: 0 }];
        while (queue.length > 0) {
            const { id, depth: currentDepth } = queue.shift();
            if (currentDepth >= depth) continue;
            const children = this.lineageIndex.get(id) || [];
            for (const childId of children) {
                descendants.push({ id: childId, depth: currentDepth + 1 });
                queue.push({ id: childId, depth: currentDepth + 1 });
            }
        }
        return descendants;
    }

    getGenerationStats(generation) {
        return this.generationIndex.get(generation) || null;
    }

    getEvolutionHistory() {
        const history = [];
        for (let gen = 1; gen <= this.metadata.totalGenerations; gen++) {
            const stats = this.generationIndex.get(gen);
            if (stats) {
                history.push({ generation: gen, ...stats });
            }
        }
        return history;
    }

    query(criteria) {
        let results = null;
        if (criteria.type) {
            const typeResults = this.queryByType(criteria.type);
            results = this.mergeResults(results, typeResults);
        }
        if (criteria.minFitness !== undefined) {
            const fitnessResults = this.queryByFitness(criteria.minFitness, criteria.maxFitness);
            results = this.mergeResults(results, fitnessResults, 'and');
        }
        if (criteria.ageBucket) {
            const ageResults = this.queryByAge(criteria.ageBucket);
            results = this.mergeResults(results, ageResults, 'and');
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

    clear() {
        this.geneIndex.clear();
        this.generationIndex.clear();
        this.fitnessIndex.clear();
        this.lineageIndex.clear();
        this.metadata = {
            lastIndexBuild: null,
            totalGenes: 0,
            totalGenerations: 0
        };
    }

    async save() {
        const indexData = {
            metadata: this.metadata,
            geneIndex: this.serializeMap(this.geneIndex),
            generationIndex: Object.fromEntries(this.generationIndex),
            fitnessIndex: Object.fromEntries(this.fitnessIndex),
            lineageIndex: Object.fromEntries(this.lineageIndex)
        };
        const indexPath = path.join(this.config.indexPath, 'evolution-index.json');
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    }

    async load() {
        try {
            const indexPath = path.join(this.config.indexPath, 'evolution-index.json');
            const data = await fs.readFile(indexPath, 'utf8');
            const indexData = JSON.parse(data);
            this.metadata = indexData.metadata;
            this.geneIndex = this.deserializeMap(indexData.geneIndex);
            this.generationIndex = new Map(Object.entries(indexData.generationIndex));
            this.fitnessIndex = new Map(Object.entries(indexData.fitnessIndex));
            this.lineageIndex = new Map(Object.entries(indexData.lineageIndex));
        } catch {
            this.clear();
        }
    }

    serializeMap(map) {
        const serialized = {};
        for (const [key, value] of map.entries()) {
            if (value instanceof Map) {
                serialized[key] = Object.fromEntries(value);
            } else {
                serialized[key] = value;
            }
        }
        return serialized;
    }

    deserializeMap(data) {
        const map = new Map();
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                map.set(key, new Map(Object.entries(value)));
            } else {
                map.set(key, value);
            }
        }
        return map;
    }

    getStats() {
        return {
            metadata: this.metadata,
            geneIndexSize: this.geneIndex.size,
            generationIndexSize: this.generationIndex.size,
            fitnessIndexSize: this.fitnessIndex.size,
            lineageIndexSize: this.lineageIndex.size
        };
    }
}

export default EvolutionIndexer;
