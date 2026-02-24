/**
 * 学习系统自动化模块 (P3)
 * 负责脚本集成、自动分类、自动化任务管理
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class LearningAutomation {
    constructor(config = {}) {
        this.config = {
            scriptsPath: config.scriptsPath ?? path.join(process.env.OPENCLAW_HOME || '~/.openclaw', 'scripts', 'learning'),
            autoClassify: config.autoClassify ?? true,
            autoCrystallize: config.autoCrystallize ?? true,
            crystallizeThreshold: config.crystallizeThreshold ?? 10,
            automationRules: config.automationRules ?? [],
            hooks: config.hooks ?? {},
            ...config
        };
        this.automations = new Map();
        this.scheduledTasks = new Map();
        this.hooks = {
            onLearning: [],
            onCrystallization: [],
            onCleanup: [],
            ...this.config.hooks
        };
        this.stats = {
            autoClassified: 0,
            autoCrystallized: 0,
            scriptsRun: 0,
            hooksTriggered: 0
        };
    }

    async initialize() {
        await fs.mkdir(this.config.scriptsPath, { recursive: true });
        await this.loadAutomationRules();
        await this.loadScripts();
    }

    async loadAutomationRules() {
        try {
            const rulesPath = path.join(this.config.scriptsPath, 'automation-rules.json');
            const data = await fs.readFile(rulesPath, 'utf8');
            this.config.automationRules = JSON.parse(data);
        } catch {
            this.config.automationRules = this.getDefaultRules();
        }
    }

    getDefaultRules() {
        return [
            {
                id: 'auto-classify-failures',
                name: 'Auto Classify Failures',
                trigger: { type: 'onLearning', condition: 'type == "failure"' },
                action: { type: 'classify', priority: 'P2' },
                enabled: true
            },
            {
                id: 'auto-crystallize-patterns',
                name: 'Auto Crystallize Patterns',
                trigger: { type: 'onLearning', condition: 'useCount >= 10 && type == "pattern"' },
                action: { type: 'crystallize' },
                enabled: true
            },
            {
                id: 'auto-archive-old',
                name: 'Auto Archive Old Learnings',
                trigger: { type: 'scheduled', interval: 'daily' },
                action: { type: 'archive', maxAge: 90 },
                enabled: true
            }
        ];
    }

    async loadScripts() {
        try {
            const files = await fs.readdir(this.config.scriptsPath);
            for (const file of files) {
                if (file.endsWith('.js') || file.endsWith('.sh')) {
                    const scriptName = path.basename(file, path.extname(file));
                    this.automations.set(scriptName, {
                        path: path.join(this.config.scriptsPath, file),
                        type: file.endsWith('.js') ? 'javascript' : 'shell'
                    });
                }
            }
        } catch {
            // Scripts directory doesn't exist or is empty
        }
    }

    async runScript(scriptName, args = {}) {
        const automation = this.automations.get(scriptName);
        if (!automation) {
            return { success: false, error: `Script not found: ${scriptName}` };
        }
        try {
            let command;
            if (automation.type === 'javascript') {
                command = `node "${automation.path}" '${JSON.stringify(args)}'`;
            } else {
                command = `"${automation.path}" '${JSON.stringify(args)}'`;
            }
            const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
            this.stats.scriptsRun++;
            return { success: true, stdout, stderr };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    registerHook(event, callback) {
        if (!this.hooks[event]) {
            this.hooks[event] = [];
        }
        this.hooks[event].push(callback);
    }

    async triggerHook(event, data) {
        const callbacks = this.hooks[event] || [];
        const results = [];
        for (const callback of callbacks) {
            try {
                const result = await callback(data);
                results.push({ success: true, result });
                this.stats.hooksTriggered++;
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    async processLearning(learning) {
        await this.triggerHook('onLearning', learning);
        if (this.config.autoClassify) {
            const classification = this.autoClassifyLearning(learning);
            learning._autoClassification = classification;
            this.stats.autoClassified++;
        }
        if (this.config.autoCrystallize) {
            const shouldCrystallize = this.shouldAutoCrystallize(learning);
            if (shouldCrystallize) {
                const crystallization = await this.autoCrystallize(learning);
                learning._autoCrystallization = crystallization;
                this.stats.autoCrystallized++;
                await this.triggerHook('onCrystallization', { learning, crystallization });
            }
        }
        for (const rule of this.config.automationRules) {
            if (!rule.enabled) continue;
            if (this.matchesRule(learning, rule)) {
                await this.executeRule(rule, learning);
            }
        }
        return learning;
    }

    autoClassifyLearning(learning) {
        const classification = {
            priority: 'P2',
            category: 'general',
            tags: [],
            confidence: 0.5
        };
        if (learning.type === 'pattern') {
            classification.category = 'pattern';
            classification.confidence = 0.8;
        } else if (learning.type === 'failure') {
            classification.category = 'error';
            classification.confidence = 0.7;
        }
        if (learning.useCount >= 50) {
            classification.priority = 'P0';
            classification.confidence = Math.min(1, classification.confidence + 0.2);
        } else if (learning.useCount >= 20) {
            classification.priority = 'P1';
            classification.confidence = Math.min(1, classification.confidence + 0.1);
        }
        if (learning.tool) {
            classification.tags.push(`tool:${learning.tool}`);
        }
        if (learning.resolution) {
            classification.tags.push('resolved');
            classification.confidence = Math.min(1, classification.confidence + 0.1);
        }
        return classification;
    }

    shouldAutoCrystallize(learning) {
        if (learning.crystallizedTo) return false;
        if (learning.type !== 'pattern') return false;
        if (learning.useCount < this.config.crystallizeThreshold) return false;
        if (!learning.resolution) return false;
        return true;
    }

    async autoCrystallize(learning) {
        const patternId = `crystallized_${learning.tool}_${Date.now()}`;
        const crystallization = {
            patternId,
            sourceId: learning.id,
            tool: learning.tool,
            error: learning.error,
            resolution: learning.resolution,
            confidence: Math.min(1, learning.useCount / 50),
            createdAt: new Date().toISOString()
        };
        return crystallization;
    }

    matchesRule(learning, rule) {
        const { condition } = rule.trigger;
        if (!condition) return true;
        try {
            const evalContext = {
                type: learning.type,
                tool: learning.tool,
                useCount: learning.useCount,
                hasResolution: !!learning.resolution,
                crystallized: !!learning.crystallizedTo
            };
            const conditionFunc = new Function(...Object.keys(evalContext), `return ${condition}`);
            return conditionFunc(...Object.values(evalContext));
        } catch {
            return false;
        }
    }

    async executeRule(rule, learning) {
        const { action } = rule;
        switch (action.type) {
            case 'classify':
                learning._ruleClassification = action.priority;
                break;
            case 'crystallize':
                const crystallization = await this.autoCrystallize(learning);
                learning._ruleCrystallization = crystallization;
                break;
            case 'tag':
                if (!learning._autoTags) learning._autoTags = [];
                learning._autoTags.push(...(action.tags || []));
                break;
            case 'script':
                await this.runScript(action.script, { learning, rule });
                break;
            default:
                break;
        }
    }

    scheduleTask(taskId, interval, callback) {
        if (this.scheduledTasks.has(taskId)) {
            clearInterval(this.scheduledTasks.get(taskId).timer);
        }
        const timer = setInterval(callback, interval);
        this.scheduledTasks.set(taskId, { timer, callback, interval });
        return { taskId, interval };
    }

    cancelTask(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (task) {
            clearInterval(task.timer);
            this.scheduledTasks.delete(taskId);
            return true;
        }
        return false;
    }

    addAutomationRule(rule) {
        this.config.automationRules.push(rule);
        return rule;
    }

    removeAutomationRule(ruleId) {
        const idx = this.config.automationRules.findIndex(r => r.id === ruleId);
        if (idx !== -1) {
            this.config.automationRules.splice(idx, 1);
            return true;
        }
        return false;
    }

    updateAutomationRule(ruleId, updates) {
        const rule = this.config.automationRules.find(r => r.id === ruleId);
        if (rule) {
            Object.assign(rule, updates);
            return rule;
        }
        return null;
    }

    async saveAutomationRules() {
        const rulesPath = path.join(this.config.scriptsPath, 'automation-rules.json');
        await fs.writeFile(rulesPath, JSON.stringify(this.config.automationRules, null, 2));
    }

    getStats() {
        return {
            ...this.stats,
            automations: this.automations.size,
            scheduledTasks: this.scheduledTasks.size,
            rules: this.config.automationRules.length,
            hooks: Object.keys(this.hooks).reduce((acc, key) => {
                acc[key] = this.hooks[key].length;
                return acc;
            }, {})
        };
    }
}

export default LearningAutomation;
