const fs = require('fs');
const path = require('path');

class Optimize {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
  }

  async dedupeLearningRecords() {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) return { removed: 0 };

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    const seen = new Map();
    const deduped = [];

    for (const record of data) {
      const key = JSON.stringify({
        skill: record.skill,
        outcome: record.outcome,
        inputHash: (record.input || '').slice(0, 100)
      });

      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push(record);
      }
    }

    fs.writeFileSync(learningPath, JSON.stringify(deduped, null, 2));
    return { original: data.length, deduped: deduped.length, removed: data.length - deduped.length };
  }

  async crystallizeOldRecords(minAgeDays = 7) {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) return { crystallized: 0 };

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    const minAge = minAgeDays * 24 * 60 * 60 * 1000;
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
    return { crystallized };
  }

  async compressLearning(maxRecords = 5000) {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) return { removed: 0 };

    const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    if (data.length <= maxRecords) return { removed: 0, kept: data.length };

    const crystallized = data.filter(r => r.crystallized);
    const uncrystallized = data.filter(r => !r.crystallized)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, maxRecords - crystallized.length);

    const compressed = [...crystallized, ...uncrystallized];
    fs.writeFileSync(learningPath, JSON.stringify(compressed, null, 2));

    return { original: data.length, compressed: compressed.length, removed: data.length - compressed.length };
  }

  async optimizeQmdIndex() {
    const qmdPath = path.join(this.openclawDir, 'agents', 'main', 'qmd', 'xdg-cache', 'qmd', 'index.sqlite');
    if (!fs.existsSync(qmdPath)) return { optimized: false };

    const beforeSize = fs.statSync(qmdPath).size;

    const { execSync } = require('child_process');
    try {
      execSync('sqlite3 ~/.openclaw/agents/main/qmd/xdg-cache/qmd/index.sqlite "VACUUM; ANALYZE;"', { stdio: 'ignore' });
    } catch {}

    const afterSize = fs.statSync(qmdPath).size;
    return { optimized: true, beforeSize, afterSize, saved: beforeSize - afterSize };
  }

  async mergeSimilarPatterns() {
    const patternsDir = path.join(this.openclawDir, 'foundry', 'patterns');
    if (!fs.existsSync(patternsDir)) return { merged: 0 };

    const files = fs.readdirSync(patternsDir).filter(f => f.endsWith('.json'));
    const patterns = files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(patternsDir, f), 'utf-8'));
      } catch { return null; }
    }).filter(Boolean);

    const merged = [];
    const used = new Set();

    for (let i = 0; i < patterns.length; i++) {
      if (used.has(i)) continue;

      const group = [patterns[i]];
      for (let j = i + 1; j < patterns.length; j++) {
        if (used.has(j)) continue;
        if (this.areSimilar(patterns[i], patterns[j])) {
          group.push(patterns[j]);
          used.add(j);
        }
      }

      if (group.length > 1) {
        merged.push(this.mergeGroup(group));
      }
      used.add(i);
    }

    return { merged: merged.length, totalPatterns: patterns.length };
  }

  areSimilar(p1, p2) {
    if (p1.skill !== p2.skill) return false;
    if (p1.outcome !== p2.outcome) return false;
    return true;
  }

  mergeGroup(group) {
    return {
      ...group[0],
      count: group.length,
      mergedFrom: group.map(p => p.id || p.pattern)
    };
  }
}

module.exports = { Optimize };
