#!/usr/bin/env node
/**
 * P2: 记忆生命周期模块
 * - 分级存储 (P0/P1/P2)
 * - 自动过期
 * - 归档机制
 * - 遗忘曲线
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const ARCHIVE_DIR = join(MEMORY_ROOT, 'archive');
const LIFECYCLE_FILE = join(MEMORY_ROOT, 'core', '.lifecycle.json');

class LifecycleManager {
  constructor(config = {}) {
    this.config = {
      p0Retention: 'permanent',
      p1RetentionDays: 90,
      p2RetentionDays: 30,
      autoArchive: true,
      archiveThreshold: 30,
      forgettingCurve: true,
      forgettingHalfLife: 30,
      cleanupInterval: 86400000,
      ...config
    };
    this.lifecycle = {
      entries: {},
      stats: {
        archived: 0,
        expired: 0,
        promoted: 0,
        demoted: 0
      }
    };
  }

  async initialize() {
    this.loadLifecycle();
    this.ensureArchiveDir();
    this.scheduleCleanup();
    console.log('  ✓ 生命周期模块初始化完成');
  }

  loadLifecycle() {
    try {
      if (existsSync(LIFECYCLE_FILE)) {
        this.lifecycle = JSON.parse(readFileSync(LIFECYCLE_FILE, 'utf-8'));
      }
    } catch (e) {}
  }

  saveLifecycle() {
    try {
      writeFileSync(LIFECYCLE_FILE, JSON.stringify(this.lifecycle, null, 2));
    } catch (e) {}
  }

  ensureArchiveDir() {
    if (!existsSync(ARCHIVE_DIR)) {
      mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
  }

  classify(entry) {
    const importance = entry.importance || 0.5;
    
    if (importance >= 0.8) return 'P0';
    if (importance >= 0.5) return 'P1';
    return 'P2';
  }

  register(entry) {
    const id = entry.id;
    const level = this.classify(entry);
    
    this.lifecycle.entries[id] = {
      id,
      level,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      archiveScheduled: false,
      retentionDays: this.getRetentionDays(level)
    };
    
    this.saveLifecycle();
    return { ...entry, level, lifecycle: this.lifecycle.entries[id] };
  }

  getRetentionDays(level) {
    switch (level) {
      case 'P0': return Infinity;
      case 'P1': return this.config.p1RetentionDays;
      case 'P2': return this.config.p2RetentionDays;
      default: return this.config.p2RetentionDays;
    }
  }

  recordAccess(id) {
    const entry = this.lifecycle.entries[id];
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      if (this.config.forgettingCurve && entry.level !== 'P0') {
        this.applyForgettingCurve(entry);
      }
      
      this.saveLifecycle();
    }
  }

  applyForgettingCurve(entry) {
    const age = Date.now() - entry.createdAt;
    const halfLifeMs = this.config.forgettingHalfLife * 24 * 60 * 60 * 1000;
    const decayFactor = Math.exp(-Math.log(2) * age / halfLifeMs);
    
    const reinforcementFactor = 1 + (entry.accessCount * 0.1);
    const effectiveDecay = decayFactor * reinforcementFactor;
    
    if (effectiveDecay < 0.1 && entry.level === 'P2') {
      entry.archiveScheduled = true;
    }
  }

  shouldExpire(id) {
    const entry = this.lifecycle.entries[id];
    if (!entry || entry.level === 'P0') return false;
    
    const age = Date.now() - entry.createdAt;
    const retentionMs = entry.retentionDays * 24 * 60 * 60 * 1000;
    
    return age > retentionMs;
  }

  async expire(id) {
    const entry = this.lifecycle.entries[id];
    if (!entry) return { error: 'not_found' };
    
    if (entry.level === 'P0') {
      return { error: 'cannot_expire_permanent' };
    }
    
    delete this.lifecycle.entries[id];
    this.lifecycle.stats.expired++;
    this.saveLifecycle();
    
    return { id, status: 'expired' };
  }

  async archive(id, sourcePath) {
    if (!this.config.autoArchive) return { error: 'archive_disabled' };
    
    const entry = this.lifecycle.entries[id];
    if (!entry) return { error: 'not_found' };
    
    if (!existsSync(sourcePath)) {
      return { error: 'source_not_found' };
    }
    
    const destPath = join(ARCHIVE_DIR, `${id}_${basename(sourcePath)}`);
    
    try {
      renameSync(sourcePath, destPath);
      entry.archivedAt = Date.now();
      entry.archivePath = destPath;
      this.lifecycle.stats.archived++;
      this.saveLifecycle();
      
      return { id, status: 'archived', archivePath: destPath };
    } catch (e) {
      return { error: 'archive_failed', details: e.message };
    }
  }

  async restore(id) {
    const entry = this.lifecycle.entries[id];
    if (!entry || !entry.archivePath) {
      return { error: 'not_archived' };
    }
    
    if (!existsSync(entry.archivePath)) {
      return { error: 'archive_not_found' };
    }
    
    try {
      const originalPath = entry.archivePath.replace(`${ARCHIVE_DIR}/${id}_`, '');
      renameSync(entry.archivePath, originalPath);
      delete entry.archivePath;
      delete entry.archivedAt;
      entry.restoredAt = Date.now();
      this.saveLifecycle();
      
      return { id, status: 'restored', path: originalPath };
    } catch (e) {
      return { error: 'restore_failed', details: e.message };
    }
  }

  promote(id) {
    const entry = this.lifecycle.entries[id];
    if (!entry) return { error: 'not_found' };
    
    if (entry.level === 'P2') {
      entry.level = 'P1';
      entry.retentionDays = this.config.p1RetentionDays;
      this.lifecycle.stats.promoted++;
    } else if (entry.level === 'P1') {
      entry.level = 'P0';
      entry.retentionDays = Infinity;
      this.lifecycle.stats.promoted++;
    }
    
    this.saveLifecycle();
    return { id, level: entry.level };
  }

  demote(id) {
    const entry = this.lifecycle.entries[id];
    if (!entry) return { error: 'not_found' };
    
    if (entry.level === 'P0') {
      entry.level = 'P1';
      entry.retentionDays = this.config.p1RetentionDays;
      this.lifecycle.stats.demoted++;
    } else if (entry.level === 'P1') {
      entry.level = 'P2';
      entry.retentionDays = this.config.p2RetentionDays;
      this.lifecycle.stats.demoted++;
    }
    
    this.saveLifecycle();
    return { id, level: entry.level };
  }

  scheduleCleanup() {
    setInterval(() => this.runCleanup(), this.config.cleanupInterval);
  }

  async runCleanup() {
    console.log('    运行生命周期清理...');
    const toExpire = [];
    const toArchive = [];
    
    for (const [id, entry] of Object.entries(this.lifecycle.entries)) {
      if (this.shouldExpire(id)) {
        toExpire.push(id);
      } else if (entry.archiveScheduled && this.config.autoArchive) {
        toArchive.push(id);
      }
    }
    
    for (const id of toExpire) {
      await this.expire(id);
    }
    
    console.log(`    清理完成: ${toExpire.length} 过期, ${toArchive.length} 待归档`);
  }

  getLevelStats() {
    const stats = { P0: 0, P1: 0, P2: 0 };
    
    for (const entry of Object.values(this.lifecycle.entries)) {
      stats[entry.level]++;
    }
    
    return stats;
  }

  getAgingReport() {
    const now = Date.now();
    const report = {
      fresh: 0,
      recent: 0,
      aging: 0,
      stale: 0
    };
    
    for (const entry of Object.values(this.lifecycle.entries)) {
      const age = now - entry.createdAt;
      const days = age / (24 * 60 * 60 * 1000);
      
      if (days < 7) report.fresh++;
      else if (days < 30) report.recent++;
      else if (days < 90) report.aging++;
      else report.stale++;
    }
    
    return report;
  }

  async getStatus() {
    return {
      p0Retention: this.config.p0Retention,
      p1RetentionDays: this.config.p1RetentionDays,
      p2RetentionDays: this.config.p2RetentionDays,
      autoArchive: this.config.autoArchive,
      forgettingCurve: this.config.forgettingCurve,
      levelStats: this.getLevelStats(),
      agingReport: this.getAgingReport(),
      stats: this.lifecycle.stats,
      totalEntries: Object.keys(this.lifecycle.entries).length
    };
  }
}

export { LifecycleManager };
export default LifecycleManager;
