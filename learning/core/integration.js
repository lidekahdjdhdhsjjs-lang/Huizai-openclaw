/**
 * 学习系统集成模块 (P3)
 * 负责与Foundry、Session和其他系统的同步
 */

import fs from 'fs/promises';
import path from 'path';

export class LearningIntegration {
    constructor(config = {}) {
        this.config = {
            foundryPath: config.foundryPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'foundry'),
            sessionPath: config.sessionPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'sessions'),
            memoryPath: config.memoryPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'workspace', 'memory'),
            syncEnabled: config.syncEnabled ?? true,
            syncInterval: config.syncInterval ?? 60000,
            ...config
        };
        this.syncState = {
            lastSync: null,
            pendingChanges: [],
            conflicts: []
        };
        this.connections = new Map();
        this.eventHandlers = new Map();
    }

    async initialize() {
        if (this.config.syncEnabled) {
            await this.loadSyncState();
        }
    }

    async loadSyncState() {
        try {
            const statePath = path.join(this.config.foundryPath, 'sync-state.json');
            const data = await fs.readFile(statePath, 'utf8');
            this.syncState = JSON.parse(data);
        } catch {
            this.syncState = {
                lastSync: null,
                pendingChanges: [],
                conflicts: []
            };
        }
    }

    async saveSyncState() {
        const statePath = path.join(this.config.foundryPath, 'sync-state.json');
        await fs.writeFile(statePath, JSON.stringify(this.syncState, null, 2));
    }

    async syncWithFoundry(learnings) {
        const results = {
            exported: 0,
            imported: 0,
            conflicts: 0,
            errors: []
        };
        try {
            const foundryPath = path.join(this.config.foundryPath, 'learnings.json');
            let foundryData = [];
            try {
                const data = await fs.readFile(foundryPath, 'utf8');
                foundryData = JSON.parse(data);
            } catch {
                foundryData = [];
            }
            const foundryIds = new Set(foundryData.map(l => l.id));
            const localIds = new Set(learnings.map(l => l.id));
            for (const learning of learnings) {
                if (!foundryIds.has(learning.id)) {
                    foundryData.push(learning);
                    results.exported++;
                }
            }
            const newLearnings = [];
            for (const foundryLearning of foundryData) {
                if (!localIds.has(foundryLearning.id)) {
                    newLearnings.push(foundryLearning);
                    results.imported++;
                }
            }
            await fs.writeFile(foundryPath, JSON.stringify(foundryData, null, 2));
            this.syncState.lastSync = new Date().toISOString();
            await this.saveSyncState();
            return { ...results, newLearnings };
        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    async syncWithMemory(learnings) {
        const results = {
            stored: 0,
            retrieved: 0,
            errors: []
        };
        try {
            const memoryPath = path.join(this.config.memoryPath, 'learning-memory.json');
            let memoryData = { learnings: [], indexed: {} };
            try {
                const data = await fs.readFile(memoryPath, 'utf8');
                memoryData = JSON.parse(data);
            } catch {
                // Memory doesn't exist yet
            }
            for (const learning of learnings) {
                if (!memoryData.indexed[learning.id]) {
                    memoryData.learnings.push(this.summarizeForMemory(learning));
                    memoryData.indexed[learning.id] = true;
                    results.stored++;
                }
            }
            memoryData.updatedAt = new Date().toISOString();
            await fs.mkdir(path.dirname(memoryPath), { recursive: true });
            await fs.writeFile(memoryPath, JSON.stringify(memoryData, null, 2));
            return results;
        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    summarizeForMemory(learning) {
        return {
            id: learning.id,
            type: learning.type,
            tool: learning.tool,
            error: learning.error?.substring(0, 200),
            resolution: learning.resolution,
            useCount: learning.useCount,
            timestamp: learning.timestamp,
            crystallized: !!learning.crystallizedTo
        };
    }

    async syncWithSession(sessionId, learnings) {
        const results = {
            stored: 0,
            errors: []
        };
        try {
            const sessionPath = path.join(this.config.sessionPath, sessionId, 'learnings.json');
            await fs.mkdir(path.dirname(sessionPath), { recursive: true });
            const sessionLearnings = learnings.filter(l => 
                l.timestamp && new Date(l.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
            );
            await fs.writeFile(sessionPath, JSON.stringify(sessionLearnings, null, 2));
            results.stored = sessionLearnings.length;
            return results;
        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    registerConnection(name, config) {
        this.connections.set(name, {
            config,
            status: 'disconnected',
            lastActivity: null
        });
        return { name, status: 'registered' };
    }

    async connect(name) {
        const connection = this.connections.get(name);
        if (!connection) {
            return { success: false, error: 'Connection not found' };
        }
        connection.status = 'connected';
        connection.lastActivity = new Date().toISOString();
        return { success: true, name, status: 'connected' };
    }

    async disconnect(name) {
        const connection = this.connections.get(name);
        if (!connection) {
            return { success: false, error: 'Connection not found' };
        }
        connection.status = 'disconnected';
        return { success: true, name, status: 'disconnected' };
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

    async exportLearnings(learnings, format = 'json', options = {}) {
        const outputPath = options.outputPath || path.join(this.config.foundryPath, `export-${Date.now()}.${format}`);
        let content;
        switch (format) {
            case 'json':
                content = JSON.stringify(learnings, null, 2);
                break;
            case 'csv':
                content = this.toCSV(learnings);
                break;
            case 'markdown':
                content = this.toMarkdown(learnings);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        await fs.writeFile(outputPath, content);
        return { path: outputPath, format, count: learnings.length };
    }

    toCSV(learnings) {
        const headers = ['id', 'type', 'tool', 'useCount', 'timestamp', 'crystallized'];
        const rows = [headers.join(',')];
        for (const l of learnings) {
            rows.push(headers.map(h => {
                const value = h === 'crystallized' ? (l[h] ? 'yes' : 'no') : l[h];
                return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(','));
        }
        return rows.join('\n');
    }

    toMarkdown(learnings) {
        const lines = ['# Learning Export', '', `Generated: ${new Date().toISOString()}`, '', '## Summary', '', `- Total: ${learnings.length}`, `- Patterns: ${learnings.filter(l => l.type === 'pattern').length}`, `- Failures: ${learnings.filter(l => l.type === 'failure').length}`, '', '## Learnings', ''];
        for (const l of learnings.slice(0, 100)) {
            lines.push(`### ${l.id}`, '', `- Type: ${l.type}`, `- Tool: ${l.tool || 'N/A'}`, `- Use Count: ${l.useCount}`, `- Crystallized: ${l.crystallizedTo ? 'Yes' : 'No'}`, '');
        }
        return lines.join('\n');
    }

    async importLearnings(filePath, options = {}) {
        const content = await fs.readFile(filePath, 'utf8');
        const format = path.extname(filePath).slice(1);
        let learnings = [];
        switch (format) {
            case 'json':
                learnings = JSON.parse(content);
                break;
            case 'csv':
                learnings = this.parseCSV(content);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        if (options.merge) {
            // Merge with existing
        }
        return { imported: learnings.length, learnings };
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const headers = this.parseCSVLine(lines[0]);
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i] || '';
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

    getStats() {
        return {
            syncEnabled: this.config.syncEnabled,
            lastSync: this.syncState.lastSync,
            pendingChanges: this.syncState.pendingChanges.length,
            conflicts: this.syncState.conflicts.length,
            connections: Array.from(this.connections.entries()).map(([name, conn]) => ({
                name,
                status: conn.status,
                lastActivity: conn.lastActivity
            }))
        };
    }
}

export default LearningIntegration;
