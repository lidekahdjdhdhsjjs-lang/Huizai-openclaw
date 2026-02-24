/**
 * 学习系统安全模块 (P0)
 * 负责数据访问控制、加密、审计和隐私保护
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class LearningSecurity {
    constructor(config = {}) {
        this.config = {
            encryptionEnabled: config.encryptionEnabled ?? true,
            auditEnabled: config.auditEnabled ?? true,
            sensitivePatterns: config.sensitivePatterns ?? [
                /password/i, /secret/i, /token/i, /api[_-]?key/i,
                /credential/i, /private[_-]?key/i, /access[_-]?key/i
            ],
            maxDataAge: config.maxDataAge ?? 365 * 24 * 60 * 60 * 1000,
            dataRetentionPolicy: config.dataRetentionPolicy ?? 'auto',
            ...config
        };
        this.encryptionKey = null;
        this.auditLog = [];
        this.accessControl = new Map();
        this.sensitiveDataCache = new Map();
    }

    async initialize(masterKey) {
        if (!masterKey) {
            masterKey = crypto.randomBytes(KEY_LENGTH).toString('hex');
        }
        this.encryptionKey = crypto.scryptSync(masterKey, 'openclaw-learning-salt', KEY_LENGTH);
        await this.loadAccessControl();
        await this.loadAuditLog();
        return { success: true, message: 'Security module initialized' };
    }

    encrypt(data) {
        if (!this.config.encryptionEnabled || !this.encryptionKey) {
            return { encrypted: false, data };
        }
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        let encrypted = cipher.update(dataStr, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encrypted: true,
            data: iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
        };
    }

    decrypt(encryptedData) {
        if (!this.config.encryptionEnabled || !this.encryptionKey) {
            return encryptedData;
        }
        if (typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
            return encryptedData;
        }
        const [ivHex, authTagHex, data] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    }

    detectSensitiveData(data) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        const detected = [];
        for (const pattern of this.config.sensitivePatterns) {
            const matches = dataStr.match(pattern);
            if (matches) {
                detected.push({ pattern: pattern.source, matches });
            }
        }
        return detected;
    }

    sanitizeData(data, options = {}) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        let sanitized = dataStr;
        const replacements = [];
        for (const pattern of this.config.sensitivePatterns) {
            sanitized = sanitized.replace(pattern, (match) => {
                const hash = crypto.createHash('sha256').update(match).digest('hex').substring(0, 8);
                replacements.push({ original: match, replacement: `[REDACTED:${hash}]` });
                return `[REDACTED:${hash}]`;
            });
        }
        if (options.returnReplacements) {
            return { sanitized, replacements };
        }
        try {
            return JSON.parse(sanitized);
        } catch {
            return sanitized;
        }
    }

    async logAccess(action, resource, result, metadata = {}) {
        if (!this.config.auditEnabled) return;
        const entry = {
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            action,
            resource: this.sanitizeData(resource),
            result: result ? 'success' : 'failure',
            metadata: this.sanitizeData(metadata),
            hash: null
        };
        entry.hash = this.hashEntry(entry);
        this.auditLog.push(entry);
        if (this.auditLog.length > 10000) {
            await this.rotateAuditLog();
        }
    }

    hashEntry(entry) {
        const data = JSON.stringify({
            timestamp: entry.timestamp,
            action: entry.action,
            resource: entry.resource
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async rotateAuditLog() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logPath = path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'logs', `audit-learning-${timestamp}.json`);
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.writeFile(logPath, JSON.stringify(this.auditLog, null, 2));
        this.auditLog = this.auditLog.slice(-1000);
    }

    async loadAuditLog() {
        try {
            const logPath = path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'logs', 'audit-learning-current.json');
            const data = await fs.readFile(logPath, 'utf8');
            this.auditLog = JSON.parse(data);
        } catch {
            this.auditLog = [];
        }
    }

    async saveAuditLog() {
        const logPath = path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'logs', 'audit-learning-current.json');
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.writeFile(logPath, JSON.stringify(this.auditLog, null, 2));
    }

    setAccessControl(resource, permissions) {
        this.accessControl.set(resource, {
            permissions,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    checkAccess(resource, action, context = {}) {
        const acl = this.accessControl.get(resource);
        if (!acl) return { allowed: true, reason: 'No restrictions' };
        const { permissions } = acl;
        if (permissions.deny && permissions.deny.includes(action)) {
            return { allowed: false, reason: 'Action denied by policy' };
        }
        if (permissions.allow && !permissions.allow.includes(action)) {
            return { allowed: false, reason: 'Action not in allow list' };
        }
        if (permissions.requireRole && !context.roles?.includes(permissions.requireRole)) {
            return { allowed: false, reason: 'Insufficient role' };
        }
        return { allowed: true, reason: 'Access granted' };
    }

    async loadAccessControl() {
        try {
            const aclPath = path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'config', 'learning-acl.json');
            const data = await fs.readFile(aclPath, 'utf8');
            const acl = JSON.parse(data);
            for (const [resource, permissions] of Object.entries(acl)) {
                this.accessControl.set(resource, permissions);
            }
        } catch {
            this.setAccessControl('learnings', { allow: ['read', 'write', 'delete'] });
            this.setAccessControl('patterns', { allow: ['read', 'write'], deny: ['delete'] });
            this.setAccessControl('metrics', { allow: ['read'] });
        }
    }

    validateLearningEntry(entry) {
        const errors = [];
        if (!entry.id || typeof entry.id !== 'string') {
            errors.push('Invalid or missing id');
        }
        if (!entry.type || !['failure', 'pattern', 'insight', 'automation'].includes(entry.type)) {
            errors.push('Invalid or missing type');
        }
        if (!entry.timestamp || isNaN(Date.parse(entry.timestamp))) {
            errors.push('Invalid or missing timestamp');
        }
        const sensitiveData = this.detectSensitiveData(entry);
        if (sensitiveData.length > 0) {
            errors.push(`Sensitive data detected: ${sensitiveData.map(s => s.pattern).join(', ')}`);
        }
        return { valid: errors.length === 0, errors, sensitiveData };
    }

    generateSecureId(prefix = 'learn') {
        const timestamp = Date.now();
        const random = crypto.randomBytes(6).toString('hex');
        return `${prefix}_${timestamp}_${random}`;
    }

    getDataHash(data) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('sha256').update(dataStr).digest('hex');
    }

    verifyDataIntegrity(data, hash) {
        return this.getDataHash(data) === hash;
    }

    getStats() {
        return {
            encryptionEnabled: this.config.encryptionEnabled,
            auditEnabled: this.config.auditEnabled,
            auditLogSize: this.auditLog.length,
            accessControlEntries: this.accessControl.size,
            sensitivePatternsCount: this.config.sensitivePatterns.length
        };
    }
}

export default LearningSecurity;
