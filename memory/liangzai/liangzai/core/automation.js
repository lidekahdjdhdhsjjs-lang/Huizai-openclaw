#!/usr/bin/env node
/**
 * P3: 记忆自动化模块
 * - 自动写入
 * - 自动更新
 * - 自动关联
 * - 自动分类
 * - 整合现有脚本
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const SCRIPTS_DIR = join(MEMORY_ROOT, 'scripts');
const AUTOMATION_FILE = join(MEMORY_ROOT, 'core', '.automation.json');

class AutomationManager {
  constructor(config = {}) {
    this.config = {
      autoWrite: true,
      autoUpdate: true,
      autoLink: true,
      autoClassify: true,
      autoSummarize: true,
      summaryThreshold: 500,
      linkThreshold: 0.6,
      ...config
    };
    this.scripts = new Map();
    this.automationLog = [];
    this.relationPatterns = [
      { pattern: /(亮仔|辉仔|康仔)/g, type: 'agent' },
      { pattern: /(Discord|WhatsApp|Telegram)/gi, type: 'channel' },
      { pattern: /(token|密码|key)/gi, type: 'credential' },
      { pattern: /(cron|定时|自动化)/gi, type: 'automation' },
      { pattern: /(\d{4}-\d{2}-\d{2})/g, type: 'date' }
    ];
    this.categoryRules = [
      { keywords: ['token', 'config', '配置'], category: 'config' },
      { keywords: ['待办', 'task', 'todo'], category: 'todo' },
      { keywords: ['学习', 'learn', 'skill'], category: 'learning' },
      { keywords: ['错误', 'error', 'fix'], category: 'debug' },
      { keywords: ['进化', 'evolution', 'foundry'], category: 'evolution' }
    ];
  }

  async initialize() {
    this.loadScripts();
    this.loadAutomationState();
    console.log('  ✓ 自动化模块初始化完成');
  }

  loadScripts() {
    try {
      const files = readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const name = basename(file, '.js');
        this.scripts.set(name, {
          name,
          path: join(SCRIPTS_DIR, file),
          enabled: true
        });
      }
      console.log(`    加载 ${this.scripts.size} 个脚本`);
    } catch (e) {}
  }

  loadAutomationState() {
    try {
      if (existsSync(AUTOMATION_FILE)) {
        const state = JSON.parse(readFileSync(AUTOMATION_FILE, 'utf-8'));
        this.automationLog = state.log || [];
      }
    } catch (e) {}
  }

  saveAutomationState() {
    try {
      writeFileSync(AUTOMATION_FILE, JSON.stringify({
        log: this.automationLog.slice(-100),
        lastUpdated: new Date().toISOString()
      }, null, 2));
    } catch (e) {}
  }

  log(action, details) {
    this.automationLog.push({
      action,
      details,
      timestamp: new Date().toISOString()
    });
    this.saveAutomationState();
  }

  async autoWrite(entry) {
    if (!this.config.autoWrite) return entry;
    
    const processed = await this.processEntry(entry);
    this.log('auto_write', { id: processed.id, category: processed.category });
    return processed;
  }

  async processEntry(entry) {
    let processed = { ...entry };
    
    if (this.config.autoClassify) {
      processed = await this.classify(processed);
    }
    
    if (this.config.autoLink) {
      processed = await this.link(processed);
    }
    
    if (this.config.autoSummarize && (entry.content?.length || 0) > this.config.summaryThreshold) {
      processed.summary = this.generateSummary(entry.content);
    }
    
    processed.automatedAt = new Date().toISOString();
    return processed;
  }

  async classify(entry) {
    const content = (entry.content || '').toLowerCase();
    let bestCategory = 'general';
    let bestScore = 0;
    
    for (const rule of this.categoryRules) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (content.includes(kw.toLowerCase())) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = rule.category;
      }
    }
    
    entry.category = bestCategory;
    entry.categoryScore = bestScore;
    return entry;
  }

  async link(entry) {
    const content = entry.content || '';
    const relations = [];
    
    for (const { pattern, type } of this.relationPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        relations.push({
          type,
          values: [...new Set(matches)],
          count: matches.length
        });
      }
    }
    
    if (relations.length > 0) {
      entry.relations = relations;
    }
    
    return entry;
  }

  generateSummary(content) {
    const sentences = content
      .split(/[。！？\n]/)
      .filter(s => s.trim().length > 10)
      .slice(0, 3);
    
    return sentences.join(' ').substring(0, 200);
  }

  async runScript(scriptName, ...args) {
    const script = this.scripts.get(scriptName);
    if (!script) {
      return { error: 'script_not_found' };
    }
    
    try {
      const module = await import(script.path);
      if (typeof module.default === 'function') {
        const result = await module.default(...args);
        this.log('run_script', { script: scriptName, success: true });
        return result;
      }
      return { error: 'not_a_function' };
    } catch (e) {
      this.log('run_script', { script: scriptName, success: false, error: e.message });
      return { error: 'execution_failed', details: e.message };
    }
  }

  async runImportanceFilter(content) {
    try {
      const module = await import(join(SCRIPTS_DIR, 'importance-filter.js'));
      if (module.evaluateImportance) {
        return module.evaluateImportance(content);
      }
    } catch (e) {}
    return 5;
  }

  async runContradictionDetector(newEntry, existingEntries) {
    try {
      const module = await import(join(SCRIPTS_DIR, 'contradiction-detector.js'));
      if (module.detectContradiction) {
        return module.detectContradiction(newEntry, existingEntries);
      }
    } catch (e) {}
    return [];
  }

  async runAutoSummary(content) {
    try {
      const module = await import(join(SCRIPTS_DIR, 'auto-summary.js'));
      if (module.generateSummary) {
        return module.generateSummary(content);
      }
    } catch (e) {}
    return this.generateSummary(content);
  }

  enableScript(name) {
    const script = this.scripts.get(name);
    if (script) {
      script.enabled = true;
      return true;
    }
    return false;
  }

  disableScript(name) {
    const script = this.scripts.get(name);
    if (script) {
      script.enabled = false;
      return true;
    }
    return false;
  }

  getScriptStatus() {
    const status = {};
    for (const [name, script] of this.scripts) {
      status[name] = {
        enabled: script.enabled,
        path: script.path
      };
    }
    return status;
  }

  getRecentAutomations(count = 10) {
    return this.automationLog.slice(-count);
  }

  async getStatus() {
    return {
      autoWrite: this.config.autoWrite,
      autoUpdate: this.config.autoUpdate,
      autoLink: this.config.autoLink,
      autoClassify: this.config.autoClassify,
      autoSummarize: this.config.autoSummarize,
      scriptsCount: this.scripts.size,
      scripts: this.getScriptStatus(),
      recentAutomations: this.getRecentAutomations(5)
    };
  }
}

export { AutomationManager };
export default AutomationManager;
