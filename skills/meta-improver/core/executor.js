const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Rollback = require('./rollback');

class Executor {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
    this.rollback = new Rollback(config);
  }

  async execute(plan) {
    const executionId = `exec-${Date.now()}`;
    const result = {
      id: executionId,
      planId: plan.issueId,
      startTime: new Date().toISOString(),
      steps: [],
      success: true
    };

    const snapshot = await this.rollback.createSnapshot(plan);

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const stepResult = await this.executeStep(step, plan);
        result.steps.push({
          index: i,
          type: step.type,
          success: stepResult.success,
          data: stepResult.data
        });

        if (!stepResult.success) {
          result.success = false;
          result.failedStep = i;
          result.error = stepResult.error;
          break;
        }
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    result.endTime = new Date().toISOString();
    result.snapshot = snapshot.id;

    return result;
  }

  async executeStep(step, plan) {
    const handlers = {
      'load': () => this.stepLoad(step),
      'load_list': () => this.stepLoadList(step),
      'filter': () => this.stepFilter(step),
      'analyze': () => this.stepAnalyze(step),
      'dedupe': () => this.stepDedupe(step),
      'crystallize': () => this.stepCrystallize(step),
      'compress': () => this.stepCompress(step),
      'save': () => this.stepSave(step),
      'scan': () => this.stepScan(step),
      'find': () => this.stepFind(step),
      'delete': () => this.stepDelete(step),
      'delete_duplicates': () => this.stepDeleteDuplicates(step),
      'template': () => this.stepTemplate(step, plan),
      'customize': () => this.stepCustomize(step, plan),
      'write': () => this.stepWrite(step, plan),
      'gc': () => this.stepGC(),
      'report': () => ({ success: true, data: {} })
    };

    const handler = handlers[step.type];
    if (!handler) {
      return { success: false, error: `Unknown step type: ${step.type}` };
    }

    try {
      return await handler();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  expandPath(p) {
    return p.replace(/^~(?=$|\/|\\)/, process.env.HOME);
  }

  async stepLoad(step) {
    const filePath = this.expandPath(step.file);
    const dir = path.dirname(filePath);
    const pattern = path.basename(filePath);

    if (pattern.includes('*')) {
      const files = fs.readdirSync(dir).filter(f => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(f);
      });
      const data = files.map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        } catch { return null; }
      }).filter(Boolean);
      return { success: true, data: { files: files.length, data, dir } };
    } else {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data: { file: filePath, data } };
    }
  }

  async stepLoadList(step) {
    this.context = this.context || {};
    this.context.hooksToDelete = step.hooks || [];
    return { success: true, data: { count: step.hooks?.length || 0 } };
  }

  async stepFilter(step) {
    return { success: true, data: { condition: step.condition } };
  }

  async stepAnalyze(step) {
    return { success: true, data: { handler: step.handler } };
  }

  async stepDedupe(step) {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) {
      return { success: false, error: 'Learning file not found' };
    }

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    const seen = new Map();
    const deduped = [];

    for (const record of data) {
      const key = step.keys.map(k => record[k]).join('|');
      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push(record);
      }
    }

    fs.writeFileSync(learningPath, JSON.stringify(deduped, null, 2));
    return {
      success: true,
      data: { original: data.length, deduped: deduped.length, removed: data.length - deduped.length }
    };
  }

  async stepCrystallize(step) {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) {
      return { success: false, error: 'Learning file not found' };
    }

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    const minAge = step.minAge || 7 * 24 * 3600000;
    const now = Date.now();
    let crystallized = 0;

    const updated = data.map(record => {
      if (!record.crystallized && record.timestamp && (now - record.timestamp) > minAge) {
        crystallized++;
        return { ...record, crystallized: true };
      }
      return record;
    });

    fs.writeFileSync(learningPath, JSON.stringify(updated, null, 2));
    return { success: true, data: { crystallized } };
  }

  async stepCompress(step) {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) {
      return { success: false, error: 'Learning file not found' };
    }

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    const keepRecent = step.keepRecent || 1000;
    const sorted = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const compressed = sorted.slice(0, keepRecent);

    fs.writeFileSync(learningPath, JSON.stringify(compressed, null, 2));
    return { success: true, data: { original: data.length, compressed: compressed.length, removed: data.length - compressed.length } };
  }

  async stepSave(step) {
    return { success: true, data: {} };
  }

  async stepScan(step) {
    const dir = this.expandPath(step.dir);
    if (!fs.existsSync(dir)) {
      return { success: true, data: { files: [] } };
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    return { success: true, data: { files, dir } };
  }

  async stepFind(step) {
    const pattern = this.expandPath(step.pattern);
    const baseDir = pattern.split('**')[0].replace(/\/$/, '');
    
    if (!fs.existsSync(baseDir)) {
      return { success: true, data: { files: [] } };
    }

    const files = [];
    const walk = (dir) => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else files.push(fullPath);
      });
    };
    walk(baseDir);

    return { success: true, data: { files, count: files.length } };
  }

  async stepDelete(step) {
    let deleted = 0;
    const olderThan = step.olderThan;
    const now = Date.now();

    if (this.context?.files) {
      for (const file of this.context.files) {
        try {
          if (olderThan) {
            const stat = fs.statSync(file);
            if (now - stat.mtimeMs < olderThan) continue;
          }
          fs.unlinkSync(file);
          deleted++;
        } catch {}
      }
    }

    if (this.context?.hooksToDelete) {
      const hooksDir = path.join(this.openclawDir, 'foundry', 'hooks');
      for (const hook of this.context.hooksToDelete) {
        try {
          const hookPath = path.join(hooksDir, hook.file || hook);
          if (fs.existsSync(hookPath)) {
            fs.unlinkSync(hookPath);
            deleted++;
          }
        } catch {}
      }
    }

    return { success: true, data: { deleted } };
  }

  async stepDeleteDuplicates(step) {
    const hooksDir = path.join(this.openclawDir, 'foundry', 'hooks');
    const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    const signatures = new Map();
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(hooksDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const sig = content.slice(0, 200);

      if (signatures.has(sig)) {
        if (step.keepNewest) {
          const existing = signatures.get(sig);
          const existingStat = fs.statSync(path.join(hooksDir, existing));
          const currentStat = fs.statSync(filePath);
          if (existingStat.mtimeMs > currentStat.mtimeMs) {
            fs.unlinkSync(filePath);
          } else {
            fs.unlinkSync(path.join(hooksDir, existing));
            signatures.set(sig, file);
          }
        } else {
          fs.unlinkSync(filePath);
        }
        deleted++;
      } else {
        signatures.set(sig, file);
      }
    }

    return { success: true, data: { deleted, remaining: files.length - deleted } };
  }

  async stepTemplate(step, plan) {
    const templatesDir = path.join(__dirname, '..', 'templates');
    const templateName = step.name || plan.template;
    const templatePath = path.join(templatesDir, `${templateName}.js`);

    if (!fs.existsSync(templatePath)) {
      return { success: true, data: { template: null, templateName } };
    }

    const template = fs.readFileSync(templatePath, 'utf-8');
    this.context = this.context || {};
    this.context.template = template;
    return { success: true, data: { template: template.slice(0, 100) + '...', templateName } };
  }

  async stepCustomize(step, plan) {
    return { success: true, data: { customized: true } };
  }

  async stepWrite(step, plan) {
    const targetPath = this.expandPath(step.path || plan.targetPath);
    const dir = path.dirname(targetPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (this.context?.template) {
      const content = this.context.template
        .replace(/\{\{tool\}\}/g, plan.data?.tool || 'unknown')
        .replace(/\{\{name\}\}/g, plan.data?.name || 'unnamed');
      fs.writeFileSync(targetPath, content);
      return { success: true, data: { written: targetPath } };
    }

    return { success: true, data: { path: targetPath } };
  }

  async stepGC() {
    if (global.gc) {
      global.gc();
      return { success: true, data: { gc: true } };
    }
    try {
      execSync('sync && echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1', { stdio: 'ignore' });
    } catch {}
    return { success: true, data: { gc: 'sync' } };
  }
}

module.exports = { Executor };
