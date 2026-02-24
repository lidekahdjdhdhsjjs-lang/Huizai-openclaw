/**
 * 进化系统安全模块 (P0)
 * 负责基因安全、变异验证、沙箱执行
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class EvolutionSecurity {
    constructor(config = {}) {
        this.config = {
            sandboxEnabled: config.sandboxEnabled ?? true,
            mutationValidation: config.mutationValidation ?? true,
            maxMutationRate: config.maxMutationRate ?? 0.3,
            safeMode: config.safeMode ?? true,
            rollbackEnabled: config.rollbackEnabled ?? true,
            auditEnabled: config.auditEnabled ?? true,
            blacklistedPatterns: config.blacklistedPatterns ?? [
                /eval\s*\(/i,
                /Function\s*\(/i,
                /require\s*\(\s*['"]child_process/i,
                /process\.exit/i,
                /fs\.rm\s*\(.*recursive/i,
                /rm\s+-rf/i
            ],
            ...config
        };
        this.auditLog = [];
        this.geneRegistry = new Map();
        this.sandboxState = new Map();
        this.rollbackStack = [];
    }

    validateGene(gene) {
        const errors = [];
        if (!gene.id || typeof gene.id !== 'string') {
            errors.push('Invalid gene id');
        }
        if (!gene.type || !['skill', 'behavior', 'parameter', 'strategy'].includes(gene.type)) {
            errors.push('Invalid gene type');
        }
        if (gene.mutationRate !== undefined && gene.mutationRate > this.config.maxMutationRate) {
            errors.push(`Mutation rate exceeds maximum: ${gene.mutationRate} > ${this.config.maxMutationRate}`);
        }
        if (gene.code) {
            const codeValidation = this.validateCode(gene.code);
            if (!codeValidation.safe) {
                errors.push(...codeValidation.violations.map(v => `Unsafe code: ${v}`));
            }
        }
        return { valid: errors.length === 0, errors };
    }

    validateCode(code) {
        const violations = [];
        for (const pattern of this.config.blacklistedPatterns) {
            if (pattern.test(code)) {
                violations.push(`Blacklisted pattern: ${pattern.source}`);
            }
        }
        return { safe: violations.length === 0, violations };
    }

    validateMutation(originalGene, mutatedGene) {
        if (!this.config.mutationValidation) {
            return { valid: true, changes: [] };
        }
        const changes = [];
        const originalKeys = new Set(Object.keys(originalGene));
        const mutatedKeys = new Set(Object.keys(mutatedGene));
        const addedKeys = [...mutatedKeys].filter(k => !originalKeys.has(k));
        const removedKeys = [...originalKeys].filter(k => !mutatedKeys.has(k));
        if (addedKeys.length > 0) {
            changes.push({ type: 'added', keys: addedKeys });
        }
        if (removedKeys.length > 0) {
            changes.push({ type: 'removed', keys: removedKeys });
        }
        for (const key of originalKeys) {
            if (mutatedKeys.has(key) && JSON.stringify(originalGene[key]) !== JSON.stringify(mutatedGene[key])) {
                changes.push({ type: 'modified', key, from: originalGene[key], to: mutatedGene[key] });
            }
        }
        const mutationRatio = changes.length / Math.max(originalKeys.size, 1);
        if (mutationRatio > this.config.maxMutationRate) {
            return { valid: false, reason: 'Mutation rate too high', changes, mutationRatio };
        }
        return { valid: true, changes, mutationRatio };
    }

    registerGene(gene) {
        const validation = this.validateGene(gene);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        const hash = this.hashGene(gene);
        this.geneRegistry.set(gene.id, {
            gene,
            hash,
            registeredAt: new Date().toISOString()
        });
        return { success: true, hash };
    }

    hashGene(gene) {
        const data = JSON.stringify({
            id: gene.id,
            type: gene.type,
            value: gene.value,
            code: gene.code
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    verifyGeneIntegrity(gene) {
        const registered = this.geneRegistry.get(gene.id);
        if (!registered) {
            return { valid: false, reason: 'Gene not registered' };
        }
        const currentHash = this.hashGene(gene);
        return {
            valid: currentHash === registered.hash,
            reason: currentHash === registered.hash ? 'Integrity verified' : 'Gene has been modified'
        };
    }

    async createSandbox(sandboxId) {
        if (!this.config.sandboxEnabled) {
            return { sandboxId, enabled: false };
        }
        const sandbox = {
            id: sandboxId,
            createdAt: new Date().toISOString(),
            state: 'active',
            resources: {
                maxMemory: 128 * 1024 * 1024,
                maxCpuTime: 5000,
                maxOperations: 10000
            },
            restrictions: {
                noNetwork: true,
                noFileSystem: true,
                noChildProcess: true
            }
        };
        this.sandboxState.set(sandboxId, sandbox);
        return sandbox;
    }

    async executeInSandbox(sandboxId, code, context = {}) {
        const sandbox = this.sandboxState.get(sandboxId);
        if (!sandbox) {
            return { success: false, error: 'Sandbox not found' };
        }
        if (sandbox.state !== 'active') {
            return { success: false, error: 'Sandbox not active' };
        }
        const codeValidation = this.validateCode(code);
        if (!codeValidation.safe) {
            return { success: false, error: 'Unsafe code', violations: codeValidation.violations };
        }
        try {
            const startTime = Date.now();
            const safeContext = this.createSafeContext(context);
            const result = await this.runSafeCode(code, safeContext);
            const duration = Date.now() - startTime;
            await this.logAudit('sandbox_execute', sandboxId, true, { duration });
            return { success: true, result, duration };
        } catch (error) {
            await this.logAudit('sandbox_execute', sandboxId, false, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    createSafeContext(context) {
        return {
            ...context,
            console: {
                log: () => {},
                error: () => {},
                warn: () => {}
            },
            require: undefined,
            process: undefined,
            global: undefined
        };
    }

    async runSafeCode(code, context) {
        const fn = new Function(...Object.keys(context), code);
        return fn(...Object.values(context));
    }

    async destroySandbox(sandboxId) {
        const sandbox = this.sandboxState.get(sandboxId);
        if (!sandbox) {
            return { success: false, error: 'Sandbox not found' };
        }
        sandbox.state = 'destroyed';
        this.sandboxState.delete(sandboxId);
        return { success: true };
    }

    async saveRollbackPoint(genes) {
        if (!this.config.rollbackEnabled) return null;
        const point = {
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            genes: JSON.parse(JSON.stringify(genes))
        };
        this.rollbackStack.push(point);
        if (this.rollbackStack.length > 10) {
            this.rollbackStack.shift();
        }
        return point;
    }

    async rollback(pointId) {
        if (!this.config.rollbackEnabled) {
            return { success: false, error: 'Rollback disabled' };
        }
        const point = this.rollbackStack.find(p => p.id === pointId);
        if (!point) {
            return { success: false, error: 'Rollback point not found' };
        }
        await this.logAudit('rollback', pointId, true);
        return { success: true, genes: point.genes };
    }

    async logAudit(action, target, success, metadata = {}) {
        if (!this.config.auditEnabled) return;
        this.auditLog.push({
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            action,
            target,
            success,
            metadata: this.sanitizeMetadata(metadata)
        });
    }

    sanitizeMetadata(metadata) {
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string' && value.length > 500) {
                sanitized[key] = value.substring(0, 500) + '...';
            } else if (typeof value !== 'function') {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    getRegisteredGenes() {
        return Array.from(this.geneRegistry.entries()).map(([id, data]) => ({
            id,
            type: data.gene.type,
            hash: data.hash,
            registeredAt: data.registeredAt
        }));
    }

    getStats() {
        return {
            sandboxEnabled: this.config.sandboxEnabled,
            rollbackEnabled: this.config.rollbackEnabled,
            safeMode: this.config.safeMode,
            registeredGenes: this.geneRegistry.size,
            activeSandboxes: Array.from(this.sandboxState.values()).filter(s => s.state === 'active').length,
            rollbackPoints: this.rollbackStack.length,
            auditLogSize: this.auditLog.length
        };
    }
}

export default EvolutionSecurity;
