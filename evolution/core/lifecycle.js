/**
 * 进化系统生命周期模块 (P2)
 * 负责基因保留策略、归档和清理
 */

import fs from 'fs/promises';
import path from 'path';

export class EvolutionLifecycle {
    constructor(config = {}) {
        this.config = {
            retentionPolicies: config.retentionPolicies ?? {
                elite: { maxAge: Infinity, minFitness: 0.9 },
                viable: { maxAge: 100, minFitness: 0.5 },
                experimental: { maxAge: 50, minFitness: 0.3 },
                deprecated: { maxAge: 20, minFitness: 0 }
            },
            archiveEnabled: config.archiveEnabled ?? true,
            archivePath: config.archivePath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'archive', 'evolution'),
            autoArchive: config.autoArchive ?? true,
            maxPopulationSize: config.maxPopulationSize ?? 1000,
            ...config
        };
        this.stats = {
            lastCleanup: null,
            archived: 0,
            deleted: 0,
            retained: 0
        };
    }

    classifyGene(gene) {
        const fitness = gene.fitness || 0;
        if (fitness >= 0.9) return 'elite';
        if (fitness >= 0.5) return 'viable';
        if (fitness >= 0.3) return 'experimental';
        return 'deprecated';
    }

    shouldRetain(gene, populationSize) {
        const classification = this.classifyGene(gene);
        const policy = this.config.retentionPolicies[classification];
        if (!policy) return { retain: true, reason: 'no_policy' };
        if (gene.fitness >= policy.minFitness) {
            return { retain: true, reason: 'fitness_threshold', classification };
        }
        const age = gene.generation || this.calculateGeneAge(gene);
        if (age <= policy.maxAge) {
            return { retain: true, reason: 'within_age_limit', classification };
        }
        if (populationSize <= this.config.maxPopulationSize * 0.8) {
            return { retain: true, reason: 'population_below_capacity', classification };
        }
        return { retain: false, reason: 'expired', classification };
    }

    calculateGeneAge(gene) {
        if (gene.generation) return gene.generation;
        if (gene.timestamp) {
            const age = Date.now() - new Date(gene.timestamp).getTime();
            return Math.floor(age / (24 * 60 * 60 * 1000));
        }
        return 0;
    }

    async applyRetention(genes, options = {}) {
        const results = {
            retained: [],
            archived: [],
            deleted: []
        };
        for (const gene of genes) {
            const decision = this.shouldRetain(gene, genes.length);
            if (decision.retain) {
                results.retained.push({ gene, decision });
            } else if (this.config.archiveEnabled && !options.skipArchive) {
                results.archived.push({ gene, decision });
            } else {
                results.deleted.push({ gene, decision });
            }
        }
        return results;
    }

    async archiveGenes(genes) {
        if (!this.config.archiveEnabled || genes.length === 0) {
            return { archived: 0 };
        }
        await fs.mkdir(this.config.archivePath, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFile = path.join(this.config.archivePath, `genes-${timestamp}.json`);
        const archiveData = {
            archivedAt: new Date().toISOString(),
            count: genes.length,
            genes: genes.map(g => g.gene || g)
        };
        await fs.writeFile(archiveFile, JSON.stringify(archiveData, null, 2));
        this.stats.archived += genes.length;
        return { archived: genes.length, file: archiveFile };
    }

    async loadArchive(archiveFile) {
        try {
            const data = await fs.readFile(archiveFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { error: error.message, genes: [] };
        }
    }

    async listArchives() {
        try {
            const files = await fs.readdir(this.config.archivePath);
            return files
                .filter(f => f.startsWith('genes-') && f.endsWith('.json'))
                .sort()
                .reverse();
        } catch {
            return [];
        }
    }

    async cleanup(genes, options = {}) {
        const startTime = Date.now();
        const results = await this.applyRetention(genes, options);
        if (results.archived.length > 0) {
            await this.archiveGenes(results.archived);
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

    managePopulation(population, newOffspring = []) {
        const maxSize = this.config.maxPopulationSize;
        const combined = [...population, ...newOffspring];
        if (combined.length <= maxSize) {
            return { population: combined, removed: [] };
        }
        const sorted = combined.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
        const kept = sorted.slice(0, maxSize);
        const removed = sorted.slice(maxSize);
        return { population: kept, removed };
    }

    getAgingReport(genes) {
        const now = Date.now();
        const buckets = {
            '0-10gen': [],
            '10-25gen': [],
            '25-50gen': [],
            '50-100gen': [],
            '>100gen': []
        };
        for (const gene of genes) {
            const age = this.calculateGeneAge(gene);
            if (age <= 10) buckets['0-10gen'].push(gene);
            else if (age <= 25) buckets['10-25gen'].push(gene);
            else if (age <= 50) buckets['25-50gen'].push(gene);
            else if (age <= 100) buckets['50-100gen'].push(gene);
            else buckets['>100gen'].push(gene);
        }
        const summary = {};
        for (const [bucket, items] of Object.entries(buckets)) {
            const fitnesses = items.map(g => g.fitness || 0);
            summary[bucket] = {
                count: items.length,
                avgFitness: fitnesses.length > 0 ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length : 0,
                bestFitness: fitnesses.length > 0 ? Math.max(...fitnesses) : 0
            };
        }
        return summary;
    }

    getClassificationDistribution(genes) {
        const distribution = { elite: 0, viable: 0, experimental: 0, deprecated: 0 };
        for (const gene of genes) {
            const classification = this.classifyGene(gene);
            distribution[classification]++;
        }
        return distribution;
    }

    async exportForAnalysis(genes, outputPath) {
        const report = {
            generatedAt: new Date().toISOString(),
            total: genes.length,
            classification: this.getClassificationDistribution(genes),
            aging: this.getAgingReport(genes),
            stats: this.getStats(),
            genes: genes.map(g => ({
                id: g.id,
                type: g.type,
                fitness: g.fitness,
                classification: this.classifyGene(g),
                age: this.calculateGeneAge(g)
            }))
        };
        await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
        return report;
    }

    getStats() {
        return {
            ...this.stats,
            config: {
                archiveEnabled: this.config.archiveEnabled,
                maxPopulationSize: this.config.maxPopulationSize,
                retentionPolicies: Object.keys(this.config.retentionPolicies)
            }
        };
    }
}

export default EvolutionLifecycle;
