const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Introspector {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
  }

  async introspect() {
    const [memory, learning, fitness, hooks, skills, resources] = await Promise.all([
      this.introspectMemory(),
      this.introspectLearning(),
      this.introspectFitness(),
      this.introspectHooks(),
      this.introspectSkills(),
      this.introspectResources()
    ]);

    return {
      timestamp: new Date().toISOString(),
      memory,
      learning,
      fitness,
      hooks,
      skills,
      resources
    };
  }

  async introspectMemory() {
    const sessionsDir = path.join(this.openclawDir, 'agents', 'main', 'sessions');
    const patternsDir = path.join(this.openclawDir, 'foundry', 'patterns');
    const failuresDir = path.join(this.openclawDir, 'foundry', 'failures');

    let sessions = 0, patterns = 0, failures = 0, unresolvedFailures = 0;

    if (fs.existsSync(sessionsDir)) {
      sessions = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json')).length;
    }
    if (fs.existsSync(patternsDir)) {
      patterns = fs.readdirSync(patternsDir).filter(f => f.endsWith('.json')).length;
    }
    if (fs.existsSync(failuresDir)) {
      const files = fs.readdirSync(failuresDir).filter(f => f.endsWith('.json'));
      failures = files.length;
      unresolvedFailures = files.filter(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf-8'));
          return !data.resolved;
        } catch { return false; }
      }).length;
    }

    const qmdDir = path.join(this.openclawDir, 'agents', 'main', 'qmd', 'xdg-cache', 'qmd');
    let qmdSize = 0, qmdFiles = 0;
    if (fs.existsSync(path.join(qmdDir, 'index.sqlite'))) {
      qmdSize = fs.statSync(path.join(qmdDir, 'index.sqlite')).size;
    }

    return { sessions, patterns, failures, unresolvedFailures, qmdSize, qmdFiles };
  }

  async introspectLearning() {
    const learningFile = path.join(this.openclawDir, 'foundry', 'learning.json');
    let records = 0, duplicates = 0, crystallized = 0;

    if (fs.existsSync(learningFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(learningFile, 'utf-8'));
        records = data.length || 0;
        const seen = new Set();
        data.forEach(r => {
          const key = JSON.stringify({ skill: r.skill, outcome: r.outcome, input: r.input?.slice(0, 100) });
          if (seen.has(key)) duplicates++;
          seen.add(key);
          if (r.crystallized) crystallized++;
        });
      } catch {}
    }

    return {
      records,
      duplicates,
      duplicateRate: records > 0 ? duplicates / records : 0,
      crystallized,
      crystallizeRate: records > 0 ? crystallized / records : 0
    };
  }

  async introspectFitness() {
    const fitnessFile = path.join(this.openclawDir, 'foundry', 'fitness.json');
    const byTool = {};
    const lowPerformers = [];

    if (fs.existsSync(fitnessFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(fitnessFile, 'utf-8'));
        Object.entries(data).forEach(([tool, stats]) => {
          const fitness = stats.successes / (stats.successes + stats.failures) || 0;
          byTool[tool] = { ...stats, fitness };
          if (fitness < 0.85) {
            lowPerformers.push({ tool, fitness, failures: stats.failures });
          }
        });
      } catch {}
    }

    return { byTool, lowPerformers, lowPerformerCount: lowPerformers.length };
  }

  async introspectHooks() {
    const hooksDir = path.join(this.openclawDir, 'foundry', 'hooks');
    let total = 0, duplicates = 0, unused = 0;
    const byType = {};
    const duplicateHooks = [];

    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
      total = files.length;
      
      const signatures = new Map();
      files.forEach(f => {
        try {
          const content = fs.readFileSync(path.join(hooksDir, f), 'utf-8');
          const sig = content.slice(0, 200);
          if (signatures.has(sig)) {
            duplicates++;
            duplicateHooks.push({ file: f, duplicateOf: signatures.get(sig) });
          } else {
            signatures.set(sig, f);
          }
          
          const type = f.split('-')[0];
          byType[type] = (byType[type] || 0) + 1;
          
          if (content.includes('browser') && content.length < 500) {
            unused++;
          }
        } catch {}
      });
    }

    return { total, duplicates, duplicateRate: total > 0 ? duplicates / total : 0, unused, byType, duplicateHooks };
  }

  async introspectSkills() {
    const skillsDir = path.join(this.openclawDir, 'workspace', 'skills');
    const installed = [], apiDependencies = [];

    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'));
      
      dirs.forEach(d => {
        const pkgPath = path.join(skillsDir, d.name, 'package.json');
        const skillPath = path.join(skillsDir, d.name, 'SKILL.md');
        
        const skill = { name: d.name, hasPackage: fs.existsSync(pkgPath), hasSkill: fs.existsSync(skillPath) };
        installed.push(skill);
        
        if (pkgPath) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.dependencies) {
              Object.keys(pkg.dependencies).forEach(dep => {
                if (dep.includes('api') || dep.includes('sdk') || dep.includes('client')) {
                  apiDependencies.push({ skill: d.name, dependency: dep });
                }
              });
            }
          } catch {}
        }
      });
    }

    return { installedCount: installed.length, installed, apiDependencies, apiDependencyCount: apiDependencies.length };
  }

  async introspectResources() {
    let memoryUsage = 0, diskUsage = 0, cpuLoad = 0;

    try {
      const freeOut = execSync('free | grep Mem', { encoding: 'utf-8' });
      const match = freeOut.match(/(\d+)\s+(\d+)/);
      if (match) memoryUsage = parseInt(match[2]) / parseInt(match[1]);
    } catch {}

    try {
      const dfOut = execSync(`df ${this.openclawDir} | tail -1`, { encoding: 'utf-8' });
      const match = dfOut.match(/(\d+)%/);
      if (match) diskUsage = parseInt(match[1]) / 100;
    } catch {}

    try {
      const loadOut = execSync('cat /proc/loadavg', { encoding: 'utf-8' });
      const match = loadOut.match(/^([\d.]+)/);
      if (match) cpuLoad = parseFloat(match[1]);
    } catch {}

    let openclawSize = 0;
    const calcSize = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) calcSize(fullPath);
        else openclawSize += fs.statSync(fullPath).size;
      });
    };
    calcSize(this.openclawDir);

    return { memoryUsage, diskUsage, cpuLoad, openclawSize };
  }
}

module.exports = { Introspector };
