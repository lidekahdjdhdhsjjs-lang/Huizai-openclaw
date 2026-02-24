#!/usr/bin/env node
/**
 * P3: 记忆系统集成模块
 * - Foundry 同步
 * - Session 同步
 * - Hooks 集成
 * - 通道集成
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const OPENCLAW_ROOT = process.env.HOME + '/.openclaw';
const FOUNDRY_DIR = join(OPENCLAW_ROOT, 'foundry');
const AGENTS_DIR = join(OPENCLAW_ROOT, 'agents');
const HOOKS_DIR = join(OPENCLAW_ROOT, 'hooks');
const INTEGRATION_FILE = join(MEMORY_ROOT, 'core', '.integration.json');

class IntegrationManager {
  constructor(config = {}) {
    this.config = {
      foundrySync: true,
      sessionSync: true,
      hooksEnabled: true,
      channelSync: true,
      syncInterval: 300000,
      ...config
    };
    this.foundryData = null;
    this.sessionData = null;
    this.syncLog = [];
  }

  async initialize() {
    this.loadIntegrationState();
    if (this.config.foundrySync) {
      await this.syncFoundry();
    }
    if (this.config.sessionSync) {
      await this.syncSessions();
    }
    console.log('  ✓ 集成模块初始化完成');
  }

  loadIntegrationState() {
    try {
      if (existsSync(INTEGRATION_FILE)) {
        const state = JSON.parse(readFileSync(INTEGRATION_FILE, 'utf-8'));
        this.syncLog = state.syncLog || [];
      }
    } catch (e) {}
  }

  saveIntegrationState() {
    try {
      writeFileSync(INTEGRATION_FILE, JSON.stringify({
        syncLog: this.syncLog.slice(-100),
        lastUpdated: new Date().toISOString()
      }, null, 2));
    } catch (e) {}
  }

  logSync(source, action, details) {
    this.syncLog.push({
      source,
      action,
      details,
      timestamp: new Date().toISOString()
    });
    this.saveIntegrationState();
  }

  async syncFoundry() {
    try {
      const learningsPath = join(FOUNDRY_DIR, 'learnings.json');
      const metricsPath = join(FOUNDRY_DIR, 'metrics.json');
      const outcomesPath = join(FOUNDRY_DIR, 'outcomes.json');
      const taskInsightsPath = join(FOUNDRY_DIR, 'task-insights.json');

      const data = {
        learnings: existsSync(learningsPath) ? JSON.parse(readFileSync(learningsPath, 'utf-8')) : [],
        metrics: existsSync(metricsPath) ? JSON.parse(readFileSync(metricsPath, 'utf-8')) : {},
        outcomes: existsSync(outcomesPath) ? JSON.parse(readFileSync(outcomesPath, 'utf-8')) : [],
        taskInsights: existsSync(taskInsightsPath) ? JSON.parse(readFileSync(taskInsightsPath, 'utf-8')) : {}
      };

      this.foundryData = data;
      
      const insights = this.extractFoundryInsights(data);
      await this.writeToMemory('foundry-insights', insights);

      this.logSync('foundry', 'sync', {
        learningsCount: data.learnings.length,
        metricsCount: Object.keys(data.metrics).length,
        insightsCount: insights.length
      });

      return { success: true, insightsCount: insights.length };
    } catch (e) {
      this.logSync('foundry', 'error', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  extractFoundryInsights(data) {
    const insights = [];

    if (data.learnings && Array.isArray(data.learnings)) {
      for (const learning of data.learnings) {
        if (learning.type === 'pattern' && learning.useCount > 5) {
          insights.push({
            type: 'frequent_pattern',
            tool: learning.tool,
            error: learning.error,
            resolution: learning.resolution,
            useCount: learning.useCount,
            source: 'foundry'
          });
        }
      }
    }

    if (data.metrics) {
      for (const [tool, metric] of Object.entries(data.metrics)) {
        if (metric.fitness < 0.8) {
          insights.push({
            type: 'low_performace_tool',
            tool,
            fitness: metric.fitness,
            successCount: metric.successCount,
            failureCount: metric.failureCount,
            source: 'foundry'
          });
        }
      }
    }

    return insights;
  }

  async syncSessions() {
    try {
      const sessionsDir = join(AGENTS_DIR, 'main', 'sessions');
      const sessions = [];

      if (existsSync(sessionsDir)) {
        const files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
        
        for (const file of files.slice(-10)) {
          const filePath = join(sessionsDir, file);
          const content = readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          
          const sessionData = {
            file: file,
            messageCount: lines.length,
            lastModified: existsSync(filePath) ? 
              new Date(require('fs').statSync(filePath).mtime).toISOString() : null
          };
          
          sessions.push(sessionData);
        }
      }

      this.sessionData = sessions;
      
      const summary = this.summarizeSessions(sessions);
      await this.writeToMemory('sessions-summary', summary);

      this.logSync('sessions', 'sync', {
        sessionsCount: sessions.length,
        totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0)
      });

      return { success: true, sessionsCount: sessions.length };
    } catch (e) {
      this.logSync('sessions', 'error', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  summarizeSessions(sessions) {
    return {
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      latestSession: sessions[0]?.file || null,
      summary: `共 ${sessions.length} 个会话，${sessions.reduce((sum, s) => sum + s.messageCount, 0)} 条消息`
    };
  }

  async writeToMemory(type, data) {
    const memoryPath = join(MEMORY_ROOT, '知识库', `${type}.md`);
    const content = this.formatAsMarkdown(type, data);
    
    try {
      writeFileSync(memoryPath, content);
      return true;
    } catch (e) {
      return false;
    }
  }

  formatAsMarkdown(type, data) {
    const lines = [`# ${type}`, '', `更新时间: ${new Date().toISOString()}`, ''];
    
    if (Array.isArray(data)) {
      for (const item of data) {
        lines.push(`## ${item.type || 'Item'}`);
        for (const [key, value] of Object.entries(item)) {
          if (key !== 'type') {
            lines.push(`- **${key}**: ${value}`);
          }
        }
        lines.push('');
      }
    } else if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        lines.push(`- **${key}**: ${value}`);
      }
    } else {
      lines.push(String(data));
    }
    
    return lines.join('\n');
  }

  async registerHook(event, callback) {
    if (!this.config.hooksEnabled) return;
    
    this.logSync('hooks', 'register', { event });
  }

  async triggerHook(event, data) {
    if (!this.config.hooksEnabled) return;
    
    this.logSync('hooks', 'trigger', { event, dataKeys: Object.keys(data || {}) });
  }

  async getFoundryStats() {
    if (!this.foundryData) {
      await this.syncFoundry();
    }
    
    return {
      learningsCount: this.foundryData?.learnings?.length || 0,
      metricsCount: Object.keys(this.foundryData?.metrics || {}).length,
      outcomesCount: this.foundryData?.outcomes?.length || 0
    };
  }

  async getSessionStats() {
    if (!this.sessionData) {
      await this.syncSessions();
    }
    
    return {
      sessionsCount: this.sessionData?.length || 0,
      totalMessages: this.sessionData?.reduce((sum, s) => sum + s.messageCount, 0) || 0
    };
  }

  getRecentSyncs(count = 10) {
    return this.syncLog.slice(-count);
  }

  async getStatus() {
    return {
      foundrySync: this.config.foundrySync,
      sessionSync: this.config.sessionSync,
      hooksEnabled: this.config.hooksEnabled,
      channelSync: this.config.channelSync,
      foundryStats: await this.getFoundryStats(),
      sessionStats: await this.getSessionStats(),
      recentSyncs: this.getRecentSyncs(5)
    };
  }
}

export { IntegrationManager };
export default IntegrationManager;
