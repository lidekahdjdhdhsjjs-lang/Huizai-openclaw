/**
 * 进化系统集成模块 (P3)
 * 负责与其他系统同步、外部集成、数据导出
 */

import fs from 'fs/promises';
import path from 'path';

export class EvolutionIntegration {
    constructor(config = {}) {
        this.config = {
            foundryPath: config.foundryPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'foundry'),
            memoryPath: config.memoryPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'workspace', 'memory'),
            evolutionPath: config.evolutionPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'workspace', 'evolution'),
            syncEnabled: config.syncEnabled ?? true,
            ...config
        };
        this.syncState = {
            lastSync: null,
            pendingChanges: []
        };
        this.connections = new Map();
        this.eventHandlers = new Map();
    }

    async initialize() {
        await fs.mkdir(this.config.evolutionPath, { recursive: true });
        if (this.config.syncEnabled) {
            await this.loadSyncState();
        }
    }

    async loadSyncState() {
        try {
            const statePath = path.join(this.config.evolutionPath, 'sync-state.json');
            const data = await fs.readFile(statePath, 'utf8');
            this.syncState = JSON.parse(data);
        } catch {
            this.syncState = { lastSync: null, pendingChanges: [] };
        }
    }

    async saveSyncState() {
        const statePath = path.join(this.config.evolutionPath, 'sync-state.json');
        await fs.writeFile(statePath, JSON.stringify(this.syncState, null, 2));
    }

    async syncWithFoundry(genes, metrics) {
        const results = {
            exported: 0,
            imported: 0,
            errors: []
        };
        try {
            const metricsPath = path.join(this.config.foundryPath, 'metrics.json');
            let existingMetrics = {};
            try {
                const data = await fs.readFile(metricsPath, 'utf8');
                existingMetrics = JSON.parse(data);
            } catch {
                // No existing metrics
            }
            for (const gene of genes) {
                if (gene.tool && gene.fitness !== undefined) {
                    if (!existingMetrics[gene.tool]) {
                        existingMetrics[gene.tool] = {
                            toolName: gene.tool,
                            successCount: 0,
                            failureCount: 0,
                            totalLatencyMs: 0,
                            fitness: 0
                        };
                    }
                    existingMetrics[gene.tool].fitness = gene.fitness;
                    results.exported++;
                }
            }
            await fs.writeFile(metricsPath, JSON.stringify(existingMetrics, null, 2));
            this.syncState.lastSync = new Date().toISOString();
            await this.saveSyncState();
            return results;
        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    async syncWithMemory(genes) {
        const results = { stored: 0, errors: [] };
        try {
            const memoryPath = path.join(this.config.memoryPath, 'evolution-memory.json');
            await fs.mkdir(path.dirname(memoryPath), { recursive: true });
            let memoryData = { genes: [], indexed: {} };
            try {
                const data = await fs.readFile(memoryPath, 'utf8');
                memoryData = JSON.parse(data);
            } catch {
                // No existing memory
            }
            for (const gene of genes) {
                if (!memoryData.indexed[gene.id]) {
                    memoryData.genes.push({
                        id: gene.id,
                        type: gene.type,
                        fitness: gene.fitness,
                        summary: this.summarizeGene(gene)
                    });
                    memoryData.indexed[gene.id] = true;
                    results.stored++;
                }
            }
            memoryData.updatedAt = new Date().toISOString();
            await fs.writeFile(memoryPath, JSON.stringify(memoryData, null, 2));
            return results;
        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    summarizeGene(gene) {
        return {
            type: gene.type,
            fitness: gene.fitness,
            generation: gene.generation,
            hasCode: !!gene.code
        };
    }

    async exportPopulation(population, format = 'json', options = {}) {
        const outputPath = options.outputPath || path.join(
            this.config.evolutionPath, 
            `population-${Date.now()}.${format}`
        );
        let content;
        switch (format) {
            case 'json':
                content = JSON.stringify(population, null, 2);
                break;
            case 'csv':
                content = this.populationToCSV(population);
                break;
            case 'markdown':
                content = this.populationToMarkdown(population);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        await fs.writeFile(outputPath, content);
        return { path: outputPath, format, count: population.length };
    }

    populationToCSV(population) {
        const headers = ['id', 'type', 'fitness', 'generation', 'parentId'];
        const rows = [headers.join(',')];
        for (const ind of population) {
            rows.push(headers.map(h => `"${String(ind[h] || '').replace(/"/g, '""')}"`).join(','));
        }
        return rows.join('\n');
    }

    populationToMarkdown(population) {
        const lines = [
            '# Evolution Population Export',
            '',
            `Generated: ${new Date().toISOString()}`,
            '',
            '## Statistics',
            '',
            `- Population Size: ${population.length}`,
            `- Best Fitness: ${Math.max(...population.map(i => i.fitness || 0))}`,
            `- Average Fitness: ${population.reduce((a, b) => a + (b.fitness || 0), 0) / population.length}`,
            '',
            '## Individuals',
            ''
        ];
        for (const ind of population.slice(0, 50)) {
            lines.push(`### ${ind.id}`, '', `- Type: ${ind.type || 'N/A'}`, `- Fitness: ${ind.fitness || 0}`, `- Generation: ${ind.generation || 'N/A'}`, '');
        }
        return lines.join('\n');
    }

    async importPopulation(filePath, options = {}) {
        const content = await fs.readFile(filePath, 'utf8');
        const format = path.extname(filePath).slice(1);
        let population = [];
        switch (format) {
            case 'json':
                population = JSON.parse(content);
                break;
            case 'csv':
                population = this.parseCSV(content);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        return { imported: population.length, population };
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const headers = this.parseCSVLine(lines[0]);
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i] || '';
                if (h === 'fitness' || h === 'generation') {
                    obj[h] = parseFloat(obj[h]) || 0;
                }
            });
            return obj;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    registerConnection(name, config) {
        this.connections.set(name, {
            config,
            status: 'disconnected',
            lastActivity: null
        });
        return { name, status: 'registered' };
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx !== -1) {
                handlers.splice(idx, 1);
            }
        }
    }

    async emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        const results = [];
        for (const handler of handlers) {
            try {
                const result = await handler(data);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    async saveEvolutionState(state) {
        const statePath = path.join(this.config.evolutionPath, 'state.json');
        await fs.writeFile(statePath, JSON.stringify(state, null, 2));
        return { saved: true };
    }

    async loadEvolutionState() {
        try {
            const statePath = path.join(this.config.evolutionPath, 'state.json');
            const data = await fs.readFile(statePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    getStats() {
        return {
            syncEnabled: this.config.syncEnabled,
            lastSync: this.syncState.lastSync,
            pendingChanges: this.syncState.pendingChanges.length,
            connections: Array.from(this.connections.entries()).map(([name, conn]) => ({
                name,
                status: conn.status
            }))
        };
    }
}

export default EvolutionIntegration;
