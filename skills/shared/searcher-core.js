const fs = require('fs');
const path = require('path');

class SearcherCore {
  constructor(indexer) {
    this.indexer = indexer;
  }

  search(query, options = {}) {
    const startTime = Date.now();
    const results = this.indexer.search(query, options);
    return {
      query,
      results: results.map(r => ({
        id: r.id,
        title: r.metadata?.title || r.id,
        snippet: this.snippet(r.content, query, 150),
        score: r.score,
        metadata: r.metadata
      })),
      meta: {
        total: results.length,
        took: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }

  snippet(content, query, maxLength = 150) {
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return content.slice(0, maxLength) + '...';
    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + query.length + 50);
    let result = content.slice(start, end);
    if (start > 0) result = '...' + result;
    if (end < content.length) result = result + '...';
    return result;
  }

  fuzzySearch(query, options = {}) {
    const threshold = options.threshold || 0.5;
    const results = [];
    
    for (const [id, entry] of this.indexer.cache) {
      const score = this.fuzzyMatch(query, entry.content);
      if (score >= threshold) {
        results.push({ ...entry, score });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  fuzzyMatch(pattern, text) {
    const p = pattern.toLowerCase();
    const t = text.toLowerCase();
    let patternIdx = 0;
    let score = 0;
    
    for (let i = 0; i < t.length && patternIdx < p.length; i++) {
      if (t[i] === p[patternIdx]) {
        score++;
        patternIdx++;
      }
    }
    
    return patternIdx === p.length ? score / p.length : 0;
  }

  suggest(query, options = {}) {
    const limit = options.limit || 5;
    const terms = new Set();
    
    for (const entry of this.indexer.cache.values()) {
      const words = entry.content.toLowerCase().split(/\s+/);
      words.forEach(w => {
        if (w.startsWith(query.toLowerCase()) && w.length > 2) {
          terms.add(w);
        }
      });
    }
    
    return Array.from(terms).slice(0, limit);
  }
}

module.exports = { SearcherCore };
