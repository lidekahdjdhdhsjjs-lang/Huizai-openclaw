const fs = require('fs');
const path = require('path');

class CreateSkill {
  constructor(config) {
    this.config = config;
    this.skillsDir = path.join(process.env.HOME, '.openclaw', 'workspace', 'skills');
  }

  async create(options) {
    const { name, description, type = 'basic', dependencies = [] } = options;
    const skillDir = path.join(this.skillsDir, name);

    if (fs.existsSync(skillDir)) {
      return { success: false, error: `Skill ${name} already exists` };
    }

    fs.mkdirSync(skillDir, { recursive: true });

    const files = this.generateFiles(name, description, type, dependencies);
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(skillDir, filename), content);
    }

    return { success: true, path: skillDir, files: Object.keys(files) };
  }

  generateFiles(name, description, type, dependencies) {
    const packageJson = {
      name,
      version: '1.0.0',
      description,
      main: 'index.js',
      keywords: [type, 'auto-generated'],
      license: 'MIT'
    };

    if (dependencies.length > 0) {
      packageJson.dependencies = {};
      dependencies.forEach(dep => {
        packageJson.dependencies[dep] = 'latest';
      });
    }

    return {
      'package.json': JSON.stringify(packageJson, null, 2),
      'SKILL.md': this.generateSkillMd(name, description, type),
      'index.js': this.generateIndexJs(name, type)
    };
  }

  generateSkillMd(name, description, type) {
    return `# ${name}

${description}

## 功能

自动生成的${type}类型技能。

## 使用

\`\`\`javascript
const ${this.toCamelCase(name)} = require('${name}');

// 使用示例
${this.toCamelCase(name)}.run();
\`\`\`

## 配置

无需额外配置。

## 自动生成

此技能由 meta-improver 自动生成。
`;
  }

  generateIndexJs(name, type) {
    const templates = {
      'basic': `class ${this.toPascalCase(name)} {
  constructor(options = {}) {
    this.options = options;
  }

  async run() {
    return { success: true, message: '${name} executed' };
  }
}

module.exports = { ${this.toPascalCase(name)} };`,

      'analyzer': `class ${this.toPascalCase(name)} {
  constructor(options = {}) {
    this.options = options;
  }

  async analyze(data) {
    return {
      analyzed: true,
      timestamp: new Date().toISOString(),
      results: []
    };
  }
}

module.exports = { ${this.toPascalCase(name)} };`,

      'processor': `class ${this.toPascalCase(name)} {
  constructor(options = {}) {
    this.options = options;
  }

  async process(input) {
    return {
      processed: true,
      input,
      output: null
    };
  }
}

module.exports = { ${this.toPascalCase(name)} };`,

      'integration': `class ${this.toPascalCase(name)} {
  constructor(options = {}) {
    this.options = options;
  }

  async connect() {
    return { connected: true };
  }

  async execute(action, params) {
    return { action, result: null };
  }

  async disconnect() {
    return { disconnected: true };
  }
}

module.exports = { ${this.toPascalCase(name)} };`
    };

    return templates[type] || templates['basic'];
  }

  toCamelCase(str) {
    return str.split('-').map((word, i) => 
      i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }

  toPascalCase(str) {
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }
}

module.exports = { CreateSkill };
