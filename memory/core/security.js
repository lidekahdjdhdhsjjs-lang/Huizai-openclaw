#!/usr/bin/env node
/**
 * P0: 记忆安全模块
 * - 访问控制
 * - 敏感数据加密
 * - 数据脱敏
 * - 审计日志
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const AUDIT_LOG = join(MEMORY_ROOT, 'logs', 'security-audit.log');

class SecurityManager {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      sensitivePatterns: ['token', 'password', 'secret', 'key', 'api', 'credential', 'auth'],
      encryptionEnabled: false,
      encryptionKey: null,
      auditLog: true,
      accessControl: true,
      ...config
    };
    this.accessLog = new Map();
    this.sensitiveCache = new Set();
  }

  async initialize() {
    this.loadSensitivePatterns();
    if (this.config.encryptionEnabled && !this.config.encryptionKey) {
      this.config.encryptionKey = this.generateKey();
    }
    console.log('  ✓ 安全模块初始化完成');
  }

  loadSensitivePatterns() {
    const patterns = [
      /\b[A-Za-z0-9]{32,}\b/g,
      /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,
      /\b(?:sk-|pk-|xox[baprs]-|ghp_)[A-Za-z0-9]{20,}\b/g,
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      /(?:password|passwd|pwd)\s*[=:]\s*\S+/gi,
      /(?:token|secret|key)\s*[=:]\s*\S+/gi
    ];
    this.sensitiveRegexps = patterns;
  }

  isSensitive(content) {
    if (typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    for (const pattern of this.config.sensitivePatterns) {
      if (lower.includes(pattern.toLowerCase())) return true;
    }
    for (const regex of this.sensitiveRegexps) {
      if (regex.test(content)) return true;
    }
    return false;
  }

  sanitize(entry) {
    if (!this.config.enabled) return entry;
    
    const content = typeof entry === 'string' ? entry : JSON.stringify(entry);
    let sanitized = content;
    const redactions = [];

    for (const regex of this.sensitiveRegexps) {
      sanitized = sanitized.replace(regex, (match) => {
        redactions.push({ original: match.substring(0, 4) + '...', type: 'sensitive' });
        return '[REDACTED]';
      });
    }

    if (redactions.length > 0) {
      this.logAudit('sanitize', { redactions: redactions.length });
    }

    return typeof entry === 'string' ? sanitized : { ...entry, content: sanitized, _redacted: redactions.length > 0 };
  }

  encrypt(data) {
    if (!this.config.encryptionEnabled || !this.config.encryptionKey) {
      return data;
    }
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(this.config.encryptionKey, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: true,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  decrypt(encryptedData) {
    if (!encryptedData.encrypted || !this.config.encryptionKey) {
      return encryptedData;
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.config.encryptionKey, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.data, 'hex')),
      decipher.final()
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  hash(content) {
    return createHash('sha256').update(content).digest('hex');
  }

  generateKey() {
    return randomBytes(32).toString('hex');
  }

  checkAccess(userId, memoryId, action) {
    if (!this.config.accessControl) return true;
    
    const key = `${userId}:${memoryId}`;
    const now = Date.now();
    const record = this.accessLog.get(key) || { count: 0, lastAccess: 0 };
    
    if (now - record.lastAccess < 1000 && record.count > 10) {
      this.logAudit('rate_limited', { userId, memoryId, action });
      return false;
    }
    
    record.count++;
    record.lastAccess = now;
    this.accessLog.set(key, record);
    
    this.logAudit('access', { userId, memoryId, action });
    return true;
  }

  logAudit(action, details) {
    if (!this.config.auditLog) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      ...details
    };
    
    try {
      appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n');
    } catch (e) {}
  }

  async getStatus() {
    return {
      enabled: this.config.enabled,
      encryptionEnabled: this.config.encryptionEnabled,
      auditLogEnabled: this.config.auditLog,
      accessControlEnabled: this.config.accessControl,
      sensitivePatternsCount: this.config.sensitivePatterns.length,
      accessLogSize: this.accessLog.size
    };
  }
}

export { SecurityManager };
export default SecurityManager;
