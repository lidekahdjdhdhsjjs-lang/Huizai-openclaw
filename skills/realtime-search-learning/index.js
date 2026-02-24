/**
 * Realtime Search Learning Skill
 * 实时搜索学习技能
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const OPENCLAW_ROOT = process.env.HOME + '/.openclaw';
const FOUNDRY_ROOT = OPENCLAW_ROOT + '/foundry';
const LEARNINGS_PATH = FOUNDRY_ROOT + '/learnings.json';

class RealtimeSearchLearning {
  constructor(config = {}) {
    this.config = {
      braveApiKey: process.env.BRAVE_API_KEY || config.braveApiKey,
      githubToken: process.env.GITHUB_TOKEN || config.githubToken,
      maxResults: config.maxResults || 10,
      minQuality: config.minQuality || 0.7,
      timeout: config.timeout || 30000,
      ...config
    };
    this.sources = {
      brave: { enabled: !!this.config.braveApiKey, priority: 1 },
      github: { enabled: !!this.config.githubToken, priority: 2 },
      arxiv: { enabled: true, priority: 3 },
      hackernews: { enabled: true, priority: 4 }
    };
    this.learnings = this.loadLearnings();
  }

  loadLearnings() {
    try {
      if (fs.existsSync(LEARNINGS_PATH)) {
        return JSON.parse(fs.readFileSync(LEARNINGS_PATH, 'utf-8'));
      }
    } catch (e) {}
    return [];
  }

  saveLearnings() {
    try {
      fs.writeFileSync(LEARNINGS_PATH, JSON.stringify(this.learnings, null, 2));
    } catch (e) {}
  }

  async fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'OpenClaw-RealtimeSearch/1.0',
          'Accept': 'application/json',
          ...options.headers
        },
        timeout: this.config.timeout
      };

      const req = protocol.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });
  }

  async searchBrave(query) {
    if (!this.config.braveApiKey) {
      return { source: 'brave', results: [], error: 'API key not configured' };
    }

    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${this.config.maxResults}`;
      const response = await this.fetch(url, {
        headers: { 'X-Subscription-Token': this.config.braveApiKey }
      });

      if (response.status !== 200) {
        return { source: 'brave', results: [], error: `HTTP ${response.status}` };
      }

      const results = (response.data.web?.results || []).map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        source: 'brave',
        quality: this.assessQuality(r)
      }));

      return { source: 'brave', results };
    } catch (e) {
      return { source: 'brave', results: [], error: e.message };
    }
  }

  async searchGitHub(query) {
    try {
      const headers = {};
      if (this.config.githubToken) {
        headers['Authorization'] = `token ${this.config.githubToken}`;
      }

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${this.config.maxResults}`;
      const response = await this.fetch(url, { headers });

      if (response.status !== 200) {
        return { source: 'github', results: [], error: `HTTP ${response.status}` };
      }

      const results = (response.data.items || []).map(r => ({
        title: r.full_name,
        url: r.html_url,
        description: r.description,
        stars: r.stargazers_count,
        language: r.language,
        source: 'github',
        quality: this.assessQuality({ stars: r.stargazers_count, forks: r.forks_count })
      }));

      return { source: 'github', results };
    } catch (e) {
      return { source: 'github', results: [], error: e.message };
    }
  }

  async searchArxiv(query) {
    try {
      const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${this.config.maxResults}`;
      const response = await this.fetch(url);

      const results = [];
      const entries = (response.data || '').split('<entry>').slice(1);
      
      for (const entry of entries) {
        const title = (entry.match(/<title>(.*?)<\/title>/s) || [])[1]?.trim();
        const summary = (entry.match(/<summary>(.*?)<\/summary>/s) || [])[1]?.trim();
        const id = (entry.match(/<id>(.*?)<\/id>/) || [])[1];
        
        if (title && id) {
          results.push({
            title: title.replace(/\s+/g, ' '),
            url: id,
            description: summary?.substring(0, 200),
            source: 'arxiv',
            quality: 0.8
          });
        }
      }

      return { source: 'arxiv', results };
    } catch (e) {
      return { source: 'arxiv', results: [], error: e.message };
    }
  }

  async searchHackerNews() {
    try {
      const storiesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const storiesResponse = await this.fetch(storiesUrl);
      const storyIds = (storiesResponse.data || []).slice(0, this.config.maxResults);

      const results = [];
      for (const id of storyIds) {
        try {
          const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
          const itemResponse = await this.fetch(itemUrl);
          const item = itemResponse.data;
          
          if (item && item.title) {
            results.push({
              title: item.title,
              url: item.url || `https://news.ycombinator.com/item?id=${id}`,
              description: `Score: ${item.score}, Comments: ${item.descendants}`,
              score: item.score,
              source: 'hackernews',
              quality: Math.min(1, (item.score || 0) / 500)
            });
          }
        } catch (e) {}
      }

      return { source: 'hackernews', results };
    } catch (e) {
      return { source: 'hackernews', results: [], error: e.message };
    }
  }

  assessQuality(item) {
    let quality = 0.5;
    
    if (item.stars) quality += Math.min(0.3, item.stars / 10000);
    if (item.forks) quality += Math.min(0.1, item.forks / 1000);
    if (item.description && item.description.length > 50) quality += 0.1;
    if (item.url && item.url.includes('github.com')) quality += 0.05;
    
    return Math.min(1, quality);
  }

  async search(query) {
    console.log(`🔍 实时搜索: "${query}"`);
    
    const results = await Promise.all([
      this.sources.brave.enabled ? this.searchBrave(query) : null,
      this.sources.github.enabled ? this.searchGitHub(query) : null,
      this.sources.arxiv.enabled ? this.searchArxiv(query) : null
    ]);

    const allResults = results
      .filter(r => r && r.results && r.results.length > 0)
      .flatMap(r => r.results)
      .filter(r => r.quality >= this.config.minQuality)
      .sort((a, b) => b.quality - a.quality)
      .slice(0, this.config.maxResults);

    console.log(`✅ 找到 ${allResults.length} 条结果`);
    return allResults;
  }

  async learn(query) {
    console.log(`📚 开始学习: "${query}"`);
    
    const results = await this.search(query);
    const learnings = [];

    for (const result of results) {
      const learning = {
        id: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'web_learning',
        query,
        title: result.title,
        url: result.url,
        description: result.description,
        source: result.source,
        quality: result.quality,
        timestamp: new Date().toISOString(),
        processed: false
      };
      
      learnings.push(learning);
      this.learnings.push(learning);
    }

    this.saveLearnings();
    console.log(`✅ 学习完成: ${learnings.length} 条新知识`);
    
    return learnings;
  }

  async runLearningCycle() {
    console.log('🔄 运行学习周期...');
    
    const queries = [
      'OpenClaw AI agent',
      'LLM memory systems',
      'self-evolving AI',
      'retrieval augmented generation',
      'AI agent tools'
    ];

    let totalLearned = 0;
    
    for (const query of queries) {
      try {
        const results = await this.search(query);
        for (const result of results.slice(0, 3)) {
          const learning = {
            id: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            type: 'auto_learning',
            query,
            title: result.title,
            url: result.url,
            description: result.description,
            source: result.source,
            quality: result.quality,
            timestamp: new Date().toISOString()
          };
          this.learnings.push(learning);
          totalLearned++;
        }
      } catch (e) {
        console.log(`  ⚠️ 查询 "${query}" 失败: ${e.message}`);
      }
    }

    this.saveLearnings();
    console.log(`✅ 学习周期完成: ${totalLearned} 条新知识`);
    
    return { learned: totalLearned, total: this.learnings.length };
  }

  generateReport() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayLearnings = this.learnings.filter(l => l.timestamp?.startsWith(today));
    
    const bySource = {};
    for (const l of this.learnings) {
      bySource[l.source] = (bySource[l.source] || 0) + 1;
    }

    const report = {
      generatedAt: now.toISOString(),
      total: this.learnings.length,
      today: todayLearnings.length,
      bySource,
      avgQuality: this.learnings.reduce((sum, l) => sum + (l.quality || 0.5), 0) / Math.max(1, this.learnings.length),
      sources: this.sources
    };

    console.log('\n📊 学习报告');
    console.log('='.repeat(40));
    console.log(`总学习数: ${report.total}`);
    console.log(`今日学习: ${report.today}`);
    console.log(`平均质量: ${(report.avgQuality * 100).toFixed(1)}%`);
    console.log('\n按来源:');
    for (const [source, count] of Object.entries(bySource)) {
      console.log(`  ${source}: ${count}`);
    }

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const skill = new RealtimeSearchLearning();

  switch (command) {
    case 'search':
      const query = args.slice(1).join(' ');
      if (!query) {
        console.log('用法: node index.js search <query>');
        break;
      }
      const results = await skill.search(query);
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'learn':
      const learnQuery = args.slice(1).join(' ') || 'AI agents';
      await skill.learn(learnQuery);
      break;

    case 'cycle':
      await skill.runLearningCycle();
      break;

    case 'report':
      skill.generateReport();
      break;

    case 'setup':
      console.log('\n🔧 设置指南\n');
      console.log('1. 获取 Brave Search API Key:');
      console.log('   https://api.search.brave.com/app/keys');
      console.log('');
      console.log('2. 设置环境变量:');
      console.log('   export BRAVE_API_KEY="your-api-key"');
      console.log('   export GITHUB_TOKEN="your-token"  # 可选');
      console.log('');
      console.log('3. 或在 openclaw.json 中配置:');
      console.log('   {"skills": {"realtime-search-learning": {"braveApiKey": "..."}}}');
      break;

    default:
      console.log(`
🧠 Realtime Search Learning Skill

用法: node index.js <command> [args]

命令:
  search <query>   - 搜索指定内容
  learn [query]     - 学习并保存知识
  cycle            - 运行完整学习周期
  report           - 生成学习报告
  setup            - 显示设置指南

示例:
  node index.js search "AI memory systems"
  node index.js learn "RAG techniques"
  node index.js cycle
  node index.js report
`);
  }
}

module.exports = { RealtimeSearchLearning };

if (require.main === module) {
  main().catch(console.error);
}
