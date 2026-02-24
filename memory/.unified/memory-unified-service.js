#!/usr/bin/env node
/**
 * 统一记忆索引服务 - Unified Memory Index Service
 * 三级记忆架构实现：L0索引 → L1结构 → L2原始
 * 
 * 目标：Token效率提升50%，检索速度提升10x
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const MEMORY_DIR = path.join(OPENCLAW_DIR, 'workspace', 'memory');
const FOUNDRY_DIR = path.join(OPENCLAW_DIR, 'foundry');
const SQLITE_PATH = path.join(OPENCLAW_DIR, 'memory', 'main.sqlite');

const UNIFIED_DIR = path.join(MEMORY_DIR, '.unified');
const L0_DIR = path.join(UNIFIED_DIR, 'L0-index');
const L1_DIR = path.join(UNIFIED_DIR, 'L1-structured');
const L2_DIR = path.join(UNIFIED_DIR, 'L2-raw');

// 确保目录存在
[L0_DIR, L1_DIR, L2_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================
// L0: 索引层 - 快速访问 (< 3KB)
// ============================================

function buildL0Index() {
  const index = {
    version: '2.0',
    lastUpdated: new Date().toISOString(),
    
    // 用户画像 (从 USER.md + permanent.json 合并)
    user: loadUserProfile(),
    
    // 热点记忆 (最近7天高频访问)
    hotMemories: [],
    
    // 快速标签索引
    tagIndex: {},
    
    // 工具健康度快照
    toolHealth: {},
    
    // 待办事项摘要
    pendingTasks: []
  };

  // 加载热点记忆
  index.hotMemories = loadHotMemories();
  
  // 构建标签索引
  index.tagIndex = buildTagIndex();
  
  // 加载工具健康度
  index.toolHealth = loadToolHealth();
  
  // 加载待办
  index.pendingTasks = loadPendingTasks();

  // 写入L0索引
  const indexPath = path.join(L0_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  // 同时生成精简版 MEMORY.md
  generateMemoryMD(index);
  
  console.log(`[L0] Index built: ${indexPath}`);
  return index;
}

function loadUserProfile() {
  const profile = {
    name: '',
    preferences: {},
    discordId: '',
    timezone: 'Asia/Shanghai'
  };

  // 从 permanent.json 加载
  const permanentPath = path.join(MEMORY_DIR, 'permanent.json');
  if (fs.existsSync(permanentPath)) {
    try {
      const permanent = JSON.parse(fs.readFileSync(permanentPath, 'utf8'));
      Object.assign(profile, permanent.user || {});
    } catch (e) {}
  }

  // 从 USER.md 加载
  const userPath = path.join(OPENCLAW_DIR, 'workspace', 'USER.md');
  if (fs.existsSync(userPath)) {
    const content = fs.readFileSync(userPath, 'utf8');
    const discordMatch = content.match(/Discord ID:\s*`?(\d+)`?/);
    if (discordMatch) profile.discordId = discordMatch[1];
  }

  return profile;
}

function loadHotMemories() {
  const hot = [];
  const days = 7;
  const now = Date.now();
  
  // 扫描最近7天的文件
  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
  
  files.forEach(file => {
    const filePath = path.join(MEMORY_DIR, file);
    const stat = fs.statSync(filePath);
    const age = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    
    if (age <= days) {
      const content = fs.readFileSync(filePath, 'utf8');
      hot.push({
        file,
        age: Math.round(age * 10) / 10,
        lines: content.split('\n').length,
        preview: content.slice(0, 200).replace(/\n/g, ' ')
      });
    }
  });
  
  return hot.sort((a, b) => a.age - b.age).slice(0, 10);
}

function buildTagIndex() {
  const tagIndex = {};
  const memoryIndexPath = path.join(MEMORY_DIR, 'memory-index.json');
  
  if (fs.existsSync(memoryIndexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(memoryIndexPath, 'utf8'));
      index.files?.forEach(f => {
        f.tags?.forEach(tag => {
          if (!tagIndex[tag]) tagIndex[tag] = [];
          tagIndex[tag].push(f.name);
        });
      });
    } catch (e) {}
  }
  
  return tagIndex;
}

function loadToolHealth() {
  const metricsPath = path.join(FOUNDRY_DIR, 'metrics.json');
  if (!fs.existsSync(metricsPath)) return {};
  
  try {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const health = {};
    
    Object.entries(metrics).forEach(([tool, data]) => {
      const fitness = data.fitness || 0;
      health[tool] = {
        fitness: Math.round(fitness * 100),
        status: fitness >= 0.9 ? 'healthy' : fitness >= 0.7 ? 'degraded' : 'critical'
      };
    });
    
    return health;
  } catch (e) {
    return {};
  }
}

function loadPendingTasks() {
  const tasks = [];
  const todoDir = path.join(MEMORY_DIR, '待办');
  
  if (fs.existsSync(todoDir)) {
    const files = fs.readdirSync(todoDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
    files.slice(0, 5).forEach(file => {
      const filePath = path.join(todoDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      tasks.push({
        file,
        preview: content.slice(0, 100).replace(/\n/g, ' ')
      });
    });
  }
  
  return tasks;
}

function generateMemoryMD(index) {
  const md = `# MEMORY.md - 长期记忆索引

> 最后更新: ${new Date().toLocaleDateString('zh-CN')}

## 📂 快速索引 (L0)
| 类别 | 路径 | 说明 |
|------|------|------|
| 用户 | \`偏好/user-preferences.md\` | 用户画像 |
| 待办 | \`待办/active.md\` | 当前任务 |
| 标签 | \`.unified/L0-index/index.json\` | 标签索引 |
| 知识 | \`知识库/\` | 技能/工具/工作流 |

## 👤 用户Profile
- **Discord ID**: ${index.user.discordId || '未设置'}
- **Timezone**: ${index.user.timezone || 'Asia/Shanghai'}

## 🔧 工具健康度
${Object.entries(index.toolHealth).map(([tool, h]) => 
  `- ${tool}: ${h.fitness}% ${h.status === 'healthy' ? '✅' : h.status === 'degraded' ? '⚠️' : '❌'}`
).join('\n')}

## 🔥 热点记忆 (最近7天)
${index.hotMemories.map(m => `- \`${m.file}\` (${m.age}天前, ${m.lines}行)`).join('\n')}

## 🏷️ 标签速查
${Object.entries(index.tagIndex).slice(0, 10).map(([tag, files]) => 
  `- #${tag}: ${files.length}个文件`
).join('\n')}
`;

  const mdPath = path.join(OPENCLAW_DIR, 'workspace', 'MEMORY.md');
  fs.writeFileSync(mdPath, md);
  console.log(`[L0] MEMORY.md updated: ${mdPath}`);
}

// ============================================
// L1: 结构层 - 分类存储
// ============================================

function buildL1Structured() {
  const categories = {
    'patterns': { dir: 'patterns', desc: '模式结晶' },
    'skills': { dir: 'skills', desc: '技能知识' },
    'workflows': { dir: 'workflows', desc: '工作流' },
    'errors': { dir: 'errors', desc: '错误模式' },
    'feedback': { dir: 'feedback', desc: '用户反馈' }
  };

  // 创建分类目录
  Object.values(categories).forEach(cat => {
    const dir = path.join(L1_DIR, cat.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 提取并分类 learnings
  extractPatternsFromLearnings();
  
  // 提取技能知识
  extractSkillKnowledge();
  
  console.log(`[L1] Structured layer built`);
}

function extractPatternsFromLearnings() {
  const learningsPath = path.join(FOUNDRY_DIR, 'learnings.json');
  if (!fs.existsSync(learningsPath)) return;

  try {
    const learnings = JSON.parse(fs.readFileSync(learningsPath, 'utf8'));
    
    // 统计模式
    const patternCounts = {};
    const errorPatterns = [];
    
    learnings.forEach(entry => {
      if (entry.type === 'failure' || entry.type === 'pattern') {
        const key = `${entry.tool}:${entry.error?.slice(0, 50)}`;
        patternCounts[key] = (patternCounts[key] || 0) + 1;
        
        if (entry.useCount >= 10 && !entry.crystallizedTo) {
          errorPatterns.push({
            id: entry.id,
            tool: entry.tool,
            error: entry.error,
            useCount: entry.useCount,
            resolution: entry.resolution || null
          });
        }
      }
    });

    // 写入高频模式
    const patternsPath = path.join(L1_DIR, 'patterns', 'high-frequency.json');
    fs.writeFileSync(patternsPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalPatterns: Object.keys(patternCounts).length,
      topPatterns: Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([key, count]) => ({ pattern: key, count })),
      crystallizable: errorPatterns.slice(0, 10)
    }, null, 2));
    
    console.log(`[L1] Extracted ${errorPatterns.length} crystallizable patterns`);
  } catch (e) {
    console.error('[L1] Error extracting patterns:', e.message);
  }
}

function extractSkillKnowledge() {
  const skillsDir = path.join(OPENCLAW_DIR, 'skills');
  if (!fs.existsSync(skillsDir)) return;

  const skills = [];
  const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  dirs.forEach(skillName => {
    const skillPath = path.join(skillsDir, skillName);
    const mdPath = path.join(skillPath, 'SKILL.md');
    
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf8');
      const nameMatch = content.match(/name:\s*(.+)/);
      const descMatch = content.match(/description:\s*(.+)/);
      
      skills.push({
        name: nameMatch ? nameMatch[1] : skillName,
        description: descMatch ? descMatch[1] : '',
        path: skillPath
      });
    }
  });

  const skillsIndexPath = path.join(L1_DIR, 'skills', 'index.json');
  fs.writeFileSync(skillsIndexPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: skills.length,
    skills
  }, null, 2));
  
  console.log(`[L1] Indexed ${skills.length} skills`);
}

// ============================================
// L2: 原始层 - 引用而非复制
// ============================================

function buildL2References() {
  const references = {
    learnings: FOUNDRY_DIR + '/learnings.json',
    sessions: OPENCLAW_DIR + '/agents/main/sessions',
    sqlite: SQLITE_PATH,
    logs: OPENCLAW_DIR + '/logs',
    rawMemory: MEMORY_DIR
  };

  const refPath = path.join(L2_DIR, 'references.json');
  fs.writeFileSync(refPath, JSON.stringify(references, null, 2));
  
  console.log(`[L2] References built`);
}

// ============================================
// 搜索接口
// ============================================

function search(query, options = {}) {
  const results = {
    L0: [],
    L1: [],
    L2: []
  };

  const queryLower = query.toLowerCase();

  // L0 搜索
  const index = JSON.parse(fs.readFileSync(path.join(L0_DIR, 'index.json'), 'utf8'));
  
  // 搜索热点记忆
  index.hotMemories?.forEach(m => {
    if (m.preview?.toLowerCase().includes(queryLower)) {
      results.L0.push({ type: 'hotMemory', ...m });
    }
  });

  // 搜索待办
  index.pendingTasks?.forEach(t => {
    if (t.preview?.toLowerCase().includes(queryLower)) {
      results.L0.push({ type: 'pendingTask', ...t });
    }
  });

  // L1 搜索
  const patternsPath = path.join(L1_DIR, 'patterns', 'high-frequency.json');
  if (fs.existsSync(patternsPath)) {
    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    patterns.topPatterns?.forEach(p => {
      if (p.pattern?.toLowerCase().includes(queryLower)) {
        results.L1.push({ type: 'pattern', ...p });
      }
    });
  }

  // L2 搜索 (仅在指定 deep 选项时)
  if (options.deep) {
    // 搜索原始记忆文件
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8');
      if (content.toLowerCase().includes(queryLower)) {
        results.L2.push({
          type: 'rawMemory',
          file,
          matches: (content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length
        });
      }
    });
  }

  return results;
}

// ============================================
// CLI 入口
// ============================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'build':
    buildL0Index();
    buildL1Structured();
    buildL2References();
    break;
    
  case 'search':
    const query = args[1];
    const deep = args.includes('--deep');
    if (!query) {
      console.error('Usage: node memory-unified-service.js search <query> [--deep]');
      process.exit(1);
    }
    const results = search(query, { deep });
    console.log(JSON.stringify(results, null, 2));
    break;
    
  case 'index':
    buildL0Index();
    break;
    
  case 'extract':
    buildL1Structured();
    break;
    
  default:
    console.log(`
Usage: node memory-unified-service.js <command>

Commands:
  build     构建完整三级索引
  index     仅构建L0索引
  extract   仅构建L1结构
  search    搜索记忆 (使用 --deep 进行深度搜索)

Examples:
  node memory-unified-service.js build
  node memory-unified-service.js search "Discord" --deep
`);
}
