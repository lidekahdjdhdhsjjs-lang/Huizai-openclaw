const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IndexerCore {
  constructor(options = {}) {
    this.indexPath = options.indexPath || path.join(process.env.HOME, '.openclaw', 'cache', 'indexes');
    this.cache = new Map();
    this.ensureDir(this.indexPath);
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  hash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  index(id, content, metadata = {}) {
    const entry = {
      id,
      content,
      hash: this.hash(content),
      metadata,
      indexedAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 0
    };
    this.cache.set(id, entry);
    this.persist(id, entry);
    return entry;
  }

  persist(id, entry) {
    const filePath = path.join(this.indexPath, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry));
  }

  get(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const filePath = path.join(this.indexPath, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const entry = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      this.cache.set(id, entry);
      return entry;
    }
    return null;
  }

  search(query, options = {}) {
    const results = [];
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.3;
    
    for (const [id, entry] of this.cache) {
      const score = this.matchScore(query, entry.content);
      if (score >= threshold) {
        results.push({ ...entry, score });
      }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  matchScore(query, content) {
    const q = query.toLowerCase();
    const c = content.toLowerCase();
    if (c.includes(q)) return 1.0;
    const terms = q.split(/\s+/);
    const matches = terms.filter(t => c.includes(t)).length;
    return matches / terms.length;
  }

  delete(id) {
    this.cache.delete(id);
    const filePath = path.join(this.indexPath, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  clear() {
    this.cache.clear();
    if (fs.existsSync(this.indexPath)) {
      fs.rmSync(this.indexPath, { recursive: true });
      this.ensureDir(this.indexPath);
    }
  }

  stats() {
    return {
      totalEntries: this.cache.size,
      totalSize: Array.from(this.cache.values())
        .reduce((sum, e) => sum + JSON.stringify(e).length, 0)
    };
  }
}

module.exports = { IndexerCore };
