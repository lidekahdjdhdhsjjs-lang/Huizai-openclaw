const fs = require('fs');
const path = require('path');

class Cleanup {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
  }

  async cleanupDuplicateHooks() {
    const hooksDir = path.join(this.openclawDir, 'foundry', 'hooks');
    if (!fs.existsSync(hooksDir)) return { deleted: 0 };

    const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    const signatures = new Map();
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(hooksDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const sig = this.getSignature(content);

      if (signatures.has(sig)) {
        fs.unlinkSync(filePath);
        deleted++;
      } else {
        signatures.set(sig, file);
      }
    }

    return { deleted, remaining: files.length - deleted };
  }

  async cleanupOldFailures(maxAge = 30 * 24 * 60 * 60 * 1000) {
    const failuresDir = path.join(this.openclawDir, 'foundry', 'failures');
    if (!fs.existsSync(failuresDir)) return { deleted: 0 };

    const files = fs.readdirSync(failuresDir).filter(f => f.endsWith('.json'));
    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      try {
        const filePath = path.join(failuresDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const timestamp = data.timestamp || fs.statSync(filePath).mtimeMs;

        if (now - timestamp > maxAge) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch {}
    }

    return { deleted, remaining: files.length - deleted };
  }

  async cleanupCache() {
    const cachePatterns = [
      path.join(this.openclawDir, '**', 'cache', '**'),
      path.join(this.openclawDir, '**', '*.log'),
      path.join(this.openclawDir, '**', 'tmp', '**')
    ];

    let deleted = 0;
    const now = Date.now();

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'cache' || entry.name === 'tmp') {
            fs.rmSync(fullPath, { recursive: true });
            deleted++;
          } else {
            walk(fullPath);
          }
        } else if (entry.name.endsWith('.log')) {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
            fs.unlinkSync(fullPath);
            deleted++;
          }
        }
      });
    };

    walk(this.openclawDir);
    return { deleted };
  }

  async cleanupResolvedFailures() {
    const failuresDir = path.join(this.openclawDir, 'foundry', 'failures');
    if (!fs.existsSync(failuresDir)) return { deleted: 0 };

    const files = fs.readdirSync(failuresDir).filter(f => f.endsWith('.json'));
    let deleted = 0;

    for (const file of files) {
      try {
        const filePath = path.join(failuresDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.resolved) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch {}
    }

    return { deleted };
  }

  getSignature(content) {
    const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && l.trim());
    return lines.slice(0, 10).join('\n');
  }
}

module.exports = { Cleanup };
