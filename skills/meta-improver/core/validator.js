const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Validator {
  constructor(config) {
    this.config = config;
    this.validationTime = config?.validationTime || 300000;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
  }

  async validate(executionResult, beforeSnapshot) {
    const afterSnapshot = await this.takeSnapshot();

    const comparisons = {
      fitness: this.compareFitness(beforeSnapshot, afterSnapshot),
      resources: this.compareResources(beforeSnapshot, afterSnapshot),
      errors: this.checkForErrors(afterSnapshot),
      learning: this.compareLearning(beforeSnapshot, afterSnapshot)
    };

    const score = this.calculateScore(comparisons);
    const shouldRollback = this.shouldRollback(comparisons, score);

    return {
      executionId: executionResult.id,
      before: beforeSnapshot,
      after: afterSnapshot,
      comparisons,
      score,
      shouldRollback,
      passed: !shouldRollback,
      timestamp: new Date().toISOString()
    };
  }

  async takeSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      fitness: this.getFitnessSnapshot(),
      learning: this.getLearningSnapshot(),
      resources: this.getResourceSnapshot(),
      hooks: this.getHooksSnapshot(),
      errors: this.getErrorSnapshot()
    };
    return snapshot;
  }

  getFitnessSnapshot() {
    const fitnessPath = path.join(this.openclawDir, 'foundry', 'fitness.json');
    if (!fs.existsSync(fitnessPath)) return {};

    try {
      const data = JSON.parse(fs.readFileSync(fitnessPath, 'utf-8'));
      const snapshot = {};
      for (const [tool, stats] of Object.entries(data)) {
        snapshot[tool] = {
          fitness: stats.successes / (stats.successes + stats.failures) || 0,
          successes: stats.successes,
          failures: stats.failures
        };
      }
      return snapshot;
    } catch { return {}; }
  }

  getLearningSnapshot() {
    const learningPath = path.join(this.openclawDir, 'foundry', 'learning.json');
    if (!fs.existsSync(learningPath)) return { count: 0, crystallized: 0 };

    try {
      const data = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
      return {
        count: data.length,
        crystallized: data.filter(r => r.crystallized).length
      };
    } catch { return { count: 0, crystallized: 0 }; }
  }

  getResourceSnapshot() {
    const snapshot = { memory: 0, disk: 0 };

    try {
      const freeOut = execSync('free | grep Mem', { encoding: 'utf-8' });
      const match = freeOut.match(/(\d+)\s+(\d+)/);
      if (match) snapshot.memory = parseInt(match[2]) / parseInt(match[1]);
    } catch {}

    try {
      const dfOut = execSync(`df ${this.openclawDir} 2>/dev/null | tail -1`, { encoding: 'utf-8' });
      const match = dfOut.match(/(\d+)%/);
      if (match) snapshot.disk = parseInt(match[1]) / 100;
    } catch {}

    return snapshot;
  }

  getHooksSnapshot() {
    const hooksDir = path.join(this.openclawDir, 'foundry', 'hooks');
    if (!fs.existsSync(hooksDir)) return { count: 0 };

    const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    return { count: files.length };
  }

  getErrorSnapshot() {
    const failuresDir = path.join(this.openclawDir, 'foundry', 'failures');
    if (!fs.existsSync(failuresDir)) return { count: 0 };

    const files = fs.readdirSync(failuresDir).filter(f => f.endsWith('.json'));
    let unresolved = 0;
    files.forEach(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf-8'));
        if (!data.resolved) unresolved++;
      } catch {}
    });

    return { count: files.length, unresolved };
  }

  compareFitness(before, after) {
    const result = { improved: 0, degraded: 0, unchanged: 0, details: [] };

    for (const [tool, afterStats] of Object.entries(after.fitness || {})) {
      const beforeStats = before.fitness?.[tool];
      if (!beforeStats) continue;

      const diff = afterStats.fitness - beforeStats.fitness;
      if (diff > 0.01) {
        result.improved++;
        result.details.push({ tool, diff: diff.toFixed(3), direction: 'up' });
      } else if (diff < -0.01) {
        result.degraded++;
        result.details.push({ tool, diff: diff.toFixed(3), direction: 'down' });
      } else {
        result.unchanged++;
      }
    }

    result.netChange = result.improved - result.degraded;
    return result;
  }

  compareResources(before, after) {
    return {
      memory: {
        before: before.resources?.memory || 0,
        after: after.resources?.memory || 0,
        diff: (after.resources?.memory || 0) - (before.resources?.memory || 0)
      },
      disk: {
        before: before.resources?.disk || 0,
        after: after.resources?.disk || 0,
        diff: (after.resources?.disk || 0) - (before.resources?.disk || 0)
      }
    };
  }

  compareLearning(before, after) {
    return {
      count: {
        before: before.learning?.count || 0,
        after: after.learning?.count || 0,
        diff: (after.learning?.count || 0) - (before.learning?.count || 0)
      },
      crystallized: {
        before: before.learning?.crystallized || 0,
        after: after.learning?.crystallized || 0,
        diff: (after.learning?.crystallized || 0) - (before.learning?.crystallized || 0)
      }
    };
  }

  checkForErrors(snapshot) {
    return {
      hasErrors: snapshot.errors?.unresolved > 0,
      unresolvedCount: snapshot.errors?.unresolved || 0
    };
  }

  calculateScore(comparisons) {
    let score = 100;

    // Fitness impact
    score += comparisons.fitness.netChange * 10;

    // Resource impact
    if (comparisons.resources.memory.diff > 0.1) score -= 20;
    if (comparisons.resources.memory.diff < -0.1) score += 10;

    // Error impact
    if (comparisons.errors.hasErrors && comparisons.errors.unresolvedCount > 10) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  shouldRollback(comparisons, score) {
    if (score < 50) return true;
    if (comparisons.fitness.degraded > comparisons.fitness.improved * 2) return true;
    if (comparisons.resources.memory.diff > 0.2) return true;
    return false;
  }

  async waitForValidation() {
    return new Promise(resolve => setTimeout(resolve, this.validationTime));
  }
}

module.exports = { Validator };
