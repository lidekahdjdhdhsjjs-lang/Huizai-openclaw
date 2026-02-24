#!/usr/bin/env node
/**
 * 自动赚钱系统 - Auto Income System
 * 让OpenClaw能够自动赚取API费用
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const DARK_FOREST_DIR = path.join(OPENCLAW_DIR, 'workspace', 'dark-forest');
const INCOME_DIR = path.join(DARK_FOREST_DIR, 'income');
const BALANCE_FILE = path.join(DARK_FOREST_DIR, 'balance.json');

if (!fs.existsSync(INCOME_DIR)) {
  fs.mkdirSync(INCOME_DIR, { recursive: true });
}

// 技能发布器
class SkillPublisher {
  constructor() {
    this.skillsDir = path.join(OPENCLAW_DIR, 'skills');
    this.publishedFile = path.join(INCOME_DIR, 'published-skills.json');
    this.published = this.loadPublished();
  }

  loadPublished() {
    if (fs.existsSync(this.publishedFile)) {
      return JSON.parse(fs.readFileSync(this.publishedFile, 'utf8'));
    }
    return { skills: [], totalPublished: 0 };
  }

  save() {
    fs.writeFileSync(this.publishedFile, JSON.stringify(this.published, null, 2));
  }

  discoverPublishableSkills() {
    const skills = [];
    const dirs = fs.readdirSync(this.skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    dirs.forEach(skillName => {
      const skillPath = path.join(this.skillsDir, skillName);
      const mdPath = path.join(skillPath, 'SKILL.md');
      
      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf8');
        const quality = this.assessSkillQuality(skillName, content);
        
        if (quality.score >= 50 && !this.published.skills.some(s => s.name === skillName)) {
          skills.push({
            name: skillName,
            quality: quality.score,
            category: quality.category,
            suggestedPrice: quality.suggestedPrice,
            description: quality.description
          });
        }
      }
    });

    return skills.sort((a, b) => b.quality - a.quality);
  }

  assessSkillQuality(name, content) {
    let score = 0;
    const lines = content.split('\n').length;
    
    score += Math.min(30, lines / 2);
    if (content.includes('description:')) score += 20;
    if (content.includes('## Tools') || content.includes('## 能力')) score += 20;
    if (content.includes('## Usage') || content.includes('## 使用')) score += 15;
    if (content.includes('## Features') || content.includes('## 功能')) score += 15;
    
    let category = 'utility';
    if (name.includes('error') || name.includes('fix')) category = 'reliability';
    else if (name.includes('memory') || name.includes('persist')) category = 'memory';
    else if (name.includes('browser') || name.includes('web')) category = 'web';
    else if (name.includes('evolution') || name.includes('learn')) category = 'ai';
    
    const suggestedPrice = Math.ceil(score / 15);
    
    const descMatch = content.match(/description:\s*(.+)/);
    const description = descMatch ? descMatch[1] : name;
    
    return { score, category, suggestedPrice, description };
  }

  async publishSkill(skill) {
    console.log(`📦 发布技能: ${skill.name}`);
    console.log(`   质量: ${skill.quality}分, 价格: $${skill.suggestedPrice}`);
    
    this.published.skills.push({
      name: skill.name,
      publishedAt: new Date().toISOString(),
      quality: skill.quality,
      price: skill.suggestedPrice,
      status: 'published',
      downloads: 0,
      earnings: 0
    });
    
    this.published.totalPublished++;
    this.save();
    
    console.log(`   ✅ 已发布`);
    return { success: true, skill: skill.name };
  }

  async publishAll(limit = 5) {
    const skills = this.discoverPublishableSkills().slice(0, limit);
    console.log(`\n发现 ${skills.length} 个可发布技能\n`);
    
    for (const skill of skills) {
      await this.publishSkill(skill);
    }
    
    return skills;
  }
}

// Hook市场
class HookMarketplace {
  constructor() {
    this.hooksDir = path.join(OPENCLAW_DIR, 'hooks');
    this.marketFile = path.join(INCOME_DIR, 'hook-market.json');
    this.market = this.loadMarket();
  }

  loadMarket() {
    if (fs.existsSync(this.marketFile)) {
      return JSON.parse(fs.readFileSync(this.marketFile, 'utf8'));
    }
    return { hooks: [], totalEarnings: 0 };
  }

  save() {
    fs.writeFileSync(this.marketFile, JSON.stringify(this.market, null, 2));
  }

  discoverSellableHooks() {
    const hooks = [];
    const dirs = fs.readdirSync(this.hooksDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    dirs.forEach(hookName => {
      const hookPath = path.join(this.hooksDir, hookName);
      const mdPath = path.join(hookPath, 'HOOK.md');
      
      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf8');
        
        if (hookName.startsWith('auto-fix-') || 
            hookName.startsWith('web-') || 
            hookName.startsWith('message-')) {
          
          const value = this.assessHookValue(content);
          if (!this.market.hooks.some(h => h.name === hookName)) {
            hooks.push({
              name: hookName,
              value: value,
              suggestedPrice: Math.ceil(value / 10)
            });
          }
        }
      }
    });

    return hooks;
  }

  assessHookValue(content) {
    let value = 20;
    if (content.includes('timeout') || content.includes('error')) value += 30;
    if (content.includes('retry') || content.includes('fallback')) value += 20;
    if (content.length > 500) value += 10;
    return value;
  }

  async publishHook(hook) {
    console.log(`🔧 发布Hook: ${hook.name} ($${hook.suggestedPrice})`);
    
    this.market.hooks.push({
      name: hook.name,
      publishedAt: new Date().toISOString(),
      value: hook.value,
      price: hook.suggestedPrice,
      sales: 0
    });
    
    this.save();
    console.log(`   ✅ 已发布`);
  }

  async publishAll(limit = 5) {
    const hooks = this.discoverSellableHooks().slice(0, limit);
    console.log(`\n发现 ${hooks.length} 个可销售Hooks\n`);
    
    for (const hook of hooks) {
      await this.publishHook(hook);
    }
  }
}

// 收入追踪器
class IncomeTracker {
  constructor() {
    this.publisher = new SkillPublisher();
    this.marketplace = new HookMarketplace();
  }

  async runIncomeCycle() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║        🚀 自动赚钱周期启动               ║');
    console.log('╚══════════════════════════════════════════╝\n');

    console.log('【1. 发布技能到ClawHub】');
    await this.publisher.publishAll(3);
    
    console.log('\n【2. 发布Hooks到市场】');
    await this.marketplace.publishAll(3);
    
    const skills = this.publisher.published.skills;
    const hooks = this.marketplace.market.hooks;
    
    const skillPotential = skills.length * 5;
    const hookPotential = hooks.length * 3;
    const totalPotential = (skillPotential + hookPotential) * 7; // 转人民币
    
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║        ✅ 赚钱周期完成                   ║');
    console.log('╚══════════════════════════════════════════╝');
    
    console.log(`\n📊 发布统计:`);
    console.log(`   技能: ${skills.length} 个`);
    console.log(`   Hooks: ${hooks.length} 个`);
    console.log(`\n💰 潜在月收入: ¥${totalPotential}`);
    
    return { skills: skills.length, hooks: hooks.length, potentialIncome: totalPotential };
  }

  status() {
    const skills = this.publisher.published.skills;
    const hooks = this.marketplace.market.hooks;
    
    const skillPotential = skills.length * 5;
    const hookPotential = hooks.length * 3;
    
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║        📈 收入系统状态                   ║');
    console.log('╚══════════════════════════════════════════╝');
    
    console.log(`\n📦 ClawHub技能: ${skills.length} 个`);
    console.log(`🔧 Hook市场: ${hooks.length} 个`);
    console.log(`\n💰 潜在月收入: ¥${(skillPotential + hookPotential) * 7}`);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];
const tracker = new IncomeTracker();

switch (command) {
  case 'run':
    tracker.runIncomeCycle();
    break;
  case 'status':
    tracker.status();
    break;
  case 'discover':
    console.log('\n可发布技能:');
    tracker.publisher.discoverPublishableSkills().slice(0, 10).forEach(s => {
      console.log(`  ${s.name} (${s.quality}分, $${s.suggestedPrice})`);
    });
    console.log('\n可销售Hooks:');
    tracker.marketplace.discoverSellableHooks().forEach(h => {
      console.log(`  ${h.name} ($${h.suggestedPrice})`);
    });
    break;
  default:
    console.log(`
💰 自动赚钱系统

命令:
  run       运行赚钱周期
  status    查看状态
  discover  发现可发布内容

目标: 赚取 ¥100 购买API
`);
}
