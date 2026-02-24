const fs = require('fs');
const path = require('path');

class SkillHub {
  constructor(options = {}) {
    this.skillsDir = options.skillsDir || path.join(process.env.HOME, '.openclaw', 'workspace', 'skills');
    this.index = new Map();
    this.buildIndex();
  }

  buildIndex() {
    if (!fs.existsSync(this.skillsDir)) return;
    
    const dirs = fs.readdirSync(this.skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'shared');
    
    for (const dir of dirs) {
      const skillPath = path.join(this.skillsDir, dir.name);
      const skill = this.loadSkill(skillPath);
      if (skill) this.index.set(dir.name, skill);
    }
  }

  loadSkill(skillPath) {
    const pkgPath = path.join(skillPath, 'package.json');
    const skillPath_file = path.join(skillPath, 'SKILL.md');
    
    const skill = { path: skillPath };
    
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      Object.assign(skill, {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        keywords: pkg.keywords || []
      });
    }
    
    if (fs.existsSync(skillPath_file)) {
      skill.readme = fs.readFileSync(skillPath_file, 'utf-8');
    }
    
    skill.stats = this.getStats(skillPath);
    return skill;
  }

  getStats(skillPath) {
    let files = 0, size = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          walk(fullPath);
        } else if (entry.isFile()) {
          files++;
          size += fs.statSync(fullPath).size;
        }
      }
    };
    walk(skillPath);
    return { files, size };
  }

  list() {
    return Array.from(this.index.entries()).map(([id, skill]) => ({
      id,
      name: skill.name || id,
      version: skill.version,
      description: skill.description,
      keywords: skill.keywords,
      stats: skill.stats
    }));
  }

  get(skillId) {
    return this.index.get(skillId);
  }

  search(query) {
    const q = query.toLowerCase();
    const results = [];
    
    for (const [id, skill] of this.index) {
      let score = 0;
      if (id.includes(q)) score += 0.8;
      if ((skill.name || '').toLowerCase().includes(q)) score += 0.6;
      if ((skill.description || '').toLowerCase().includes(q)) score += 0.4;
      if ((skill.keywords || []).some(k => k.toLowerCase().includes(q))) score += 0.3;
      
      if (score > 0) results.push({ id, score, skill });
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  enable(skillId) {
    return this.toggle(skillId, true);
  }

  disable(skillId) {
    return this.toggle(skillId, false);
  }

  toggle(skillId, enabled) {
    const configPath = path.join(this.skillsDir, 'local-skills.json');
    if (!fs.existsSync(configPath)) return false;
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.skills && config.skills[skillId]) {
      config.skills[skillId].enabled = enabled;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    }
    return false;
  }

  validate(skillId) {
    const skill = this.index.get(skillId);
    if (!skill) return { valid: false, errors: ['Skill not found'] };
    
    const errors = [];
    if (!fs.existsSync(path.join(skill.path, 'index.js'))) {
      errors.push('Missing index.js');
    }
    if (!fs.existsSync(path.join(skill.path, 'package.json'))) {
      errors.push('Missing package.json');
    }
    
    return { valid: errors.length === 0, errors };
  }

  refresh() {
    this.index.clear();
    this.buildIndex();
    return this.index.size;
  }

  summary() {
    const skills = this.list();
    const totalFiles = skills.reduce((sum, s) => sum + s.stats.files, 0);
    const totalSize = skills.reduce((sum, s) => sum + s.stats.size, 0);
    
    return {
      totalSkills: skills.length,
      totalFiles,
      totalSize,
      skills: skills.map(s => s.id)
    };
  }
}

module.exports = { SkillHub };
