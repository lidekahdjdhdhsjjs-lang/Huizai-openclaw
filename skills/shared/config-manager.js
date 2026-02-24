const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath || path.join(process.env.HOME, '.openclaw', 'workspace', 'skills', 'local-skills.json');
    this.config = this.load();
  }

  load() {
    if (fs.existsSync(this.configPath)) {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    }
    return this.getDefaultConfig();
  }

  save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getDefaultConfig() {
    return {
      version: '1.0.0',
      skills: {
        'local-git-analyzer': { enabled: true, cacheTTL: 3600 },
        'local-skill-hub': { enabled: true, autoUpdate: true },
        'local-bookmark-index': { enabled: true, paths: [] }
      },
      cache: { maxSize: 100 * 1024 * 1024, ttl: 3600 },
      scheduler: { enabled: true, interval: 86400000 }
    };
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }
}

module.exports = { ConfigManager };
