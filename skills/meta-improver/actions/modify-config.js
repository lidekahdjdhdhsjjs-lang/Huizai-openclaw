const fs = require('fs');
const path = require('path');

class ModifyConfig {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
  }

  async modify(target, key, value) {
    const configPath = this.getConfigPath(target);
    if (!fs.existsSync(configPath)) {
      return { success: false, error: `Config file not found: ${configPath}` };
    }

    const originalContent = fs.readFileSync(configPath, 'utf-8');
    let config;

    try {
      config = JSON.parse(originalContent);
    } catch {
      return { success: false, error: 'Invalid JSON in config file' };
    }

    const oldValue = this.getNestedValue(config, key);
    this.setNestedValue(config, key, value);

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      target,
      key,
      oldValue,
      newValue: value
    };
  }

  async batchModify(target, changes) {
    const configPath = this.getConfigPath(target);
    if (!fs.existsSync(configPath)) {
      return { success: false, error: `Config file not found: ${configPath}` };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const results = [];

    for (const { key, value } of changes) {
      const oldValue = this.getNestedValue(config, key);
      this.setNestedValue(config, key, value);
      results.push({ key, oldValue, newValue: value });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { success: true, changes: results };
  }

  getConfigPath(target) {
    const paths = {
      'main': path.join(this.openclawDir, 'openclaw.json'),
      'memory': path.join(this.openclawDir, 'workspace', 'memory', 'config', 'memory-config.json'),
      'learning': path.join(this.openclawDir, 'foundry', 'config', 'learning-config.json'),
      'skills': path.join(this.openclawDir, 'workspace', 'skills', 'local-skills.json')
    };

    return paths[target] || path.join(this.openclawDir, target);
  }

  getNestedValue(obj, key) {
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }

  setNestedValue(obj, key, value) {
    const keys = key.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  async optimizeMemoryConfig() {
    const changes = [
      { key: 'cache.maxSize', value: 200 * 1024 * 1024 },
      { key: 'retrieval.maxResults', value: 50 },
      { key: 'lifecycle.retentionDays', value: 90 }
    ];

    return this.batchModify('memory', changes);
  }

  async optimizeLearningConfig() {
    const changes = [
      { key: 'crystallization.minAge', value: 7 },
      { key: 'crystallization.threshold', value: 0.7 },
      { key: 'compression.maxRecords', value: 5000 }
    ];

    return this.batchModify('learning', changes);
  }
}

module.exports = { ModifyConfig };
