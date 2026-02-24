#!/usr/bin/env node
/**
 * P2: 记忆检索模块
 * - 混合搜索 (向量+BM25)
 * - MMR 去重
 * - 时间衰减
 * - 查询扩展
 * - 意图识别
 */

import { spawn } from 'child_process';

const MEMORY_ROOT = process.env.MEMORY_ROOT || '/home/li/.openclaw/workspace/memory';
const QMD_PATH = '/home/li/.bun/bin/qmd';

class RetrievalManager {
  constructor(config = {}) {
    this.config = {
      hybridSearch: true,
      vectorWeight: 0.6,
      textWeight: 0.4,
      mmrLambda: 0.7,
      temporalDecayHalfLife: 60,
      queryExpansion: true,
      intentRecognition: true,
      maxResults: 10,
      timeout: 5000,
      ...config
    };
    this.queryHistory = [];
    this.intentPatterns = {
      search: [/查找|搜索|find|search|查一下/i],
      recall: [/记得|记住|上次|之前|recall|remember/i],
      config: [/配置|设置|config|setting/i],
      status: [/状态|情况|status|how/i],
      learn: [/学习|了解|learn|study/i]
    };
  }

  async initialize() {
    console.log('  ✓ 检索模块初始化完成');
  }

  async search(query, options = {}) {
    const startTime = Date.now();
    const config = { ...this.config, ...options };

    const intent = config.intentRecognition ? this.recognizeIntent(query) : null;
    const expandedQuery = config.queryExpansion ? this.expandQuery(query) : query;

    let results;
    if (config.hybridSearch) {
      results = await this.hybridSearch(expandedQuery, config);
    } else {
      results = await this.qmdSearch(expandedQuery, config);
    }

    if (config.mmrLambda < 1) {
      results = this.applyMMR(results, config.mmrLambda);
    }

    if (config.temporalDecayHalfLife > 0) {
      results = this.applyTemporalDecay(results, config.temporalDecayHalfLife);
    }

    results = results.slice(0, config.maxResults);

    const duration = Date.now() - startTime;
    this.queryHistory.push({
      query,
      intent,
      resultCount: results.length,
      duration,
      timestamp: Date.now()
    });

    return {
      query,
      intent,
      results,
      meta: {
        duration,
        totalFound: results.length,
        searchMode: config.hybridSearch ? 'hybrid' : 'qmd'
      }
    };
  }

  recognizeIntent(query) {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return { type: intent, confidence: 0.8 };
        }
      }
    }
    return { type: 'general', confidence: 0.5 };
  }

  expandQuery(query) {
    const expansions = {
      '配置': ['config', 'setting', 'configuration'],
      'token': ['密钥', 'key', 'secret', 'credential'],
      '用户': ['user', '偏好', 'preference'],
      '任务': ['task', '待办', 'todo', 'cron'],
      '错误': ['error', '失败', 'failure', 'bug'],
      '学习': ['learn', 'study', '知识', 'knowledge']
    };

    let expanded = query;
    for (const [key, synonyms] of Object.entries(expansions)) {
      if (query.includes(key)) {
        expanded += ' ' + synonyms.join(' ');
      }
    }

    return expanded;
  }

  async hybridSearch(query, config) {
    const [vectorResults, textResults] = await Promise.all([
      this.qmdVectorSearch(query, config),
      this.qmdTextSearch(query, config)
    ]);

    const merged = this.mergeResults(vectorResults, textResults, config);
    return merged;
  }

  async qmdSearch(query, config) {
    return new Promise((resolve, reject) => {
      const args = ['search', query, '--json'];
      const env = {
        ...process.env,
        XDG_CONFIG_HOME: `${process.env.HOME}/.openclaw/agents/main/qmd/xdg-config`,
        XDG_CACHE_HOME: `${process.env.HOME}/.openclaw/agents/main/qmd/xdg-cache`
      };

      const proc = spawn(QMD_PATH, args, { env });
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => { output += data; });
      proc.stderr.on('data', (data) => { error += data; });

      const timeout = setTimeout(() => {
        proc.kill();
        resolve([]);
      }, config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 && output) {
          try {
            const results = this.parseQMDOutput(output);
            resolve(results);
          } catch (e) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });
  }

  async qmdVectorSearch(query, config) {
    return new Promise((resolve) => {
      const args = ['vsearch', query];
      const env = {
        ...process.env,
        XDG_CONFIG_HOME: `${process.env.HOME}/.openclaw/agents/main/qmd/xdg-config`,
        XDG_CACHE_HOME: `${process.env.HOME}/.openclaw/agents/main/qmd/xdg-cache`
      };

      const proc = spawn(QMD_PATH, args, { env });
      let output = '';

      proc.stdout.on('data', (data) => { output += data; });
      proc.stderr.on('data', () => {});

      const timeout = setTimeout(() => {
        proc.kill();
        resolve([]);
      }, config.timeout);

      proc.on('close', () => {
        clearTimeout(timeout);
        resolve(this.parseQMDOutput(output));
      });
    });
  }

  async qmdTextSearch(query, config) {
    return this.qmdSearch(query, config);
  }

  parseQMDOutput(output) {
    const results = [];
    const lines = output.split('\n');
    let current = null;

    for (const line of lines) {
      if (line.startsWith('qmd://')) {
        if (current) results.push(current);
        const match = line.match(/qmd:\/\/([^\/]+)\/(.+):(\d+)/);
        if (match) {
          current = {
            collection: match[1],
            path: match[2],
            line: parseInt(match[3]),
            score: 0
          };
        }
      } else if (line.startsWith('Score:')) {
        if (current) {
          const match = line.match(/Score:\s+([\d.]+)%/);
          if (match) {
            current.score = parseFloat(match[1]) / 100;
          }
        }
      } else if (line.startsWith('@@')) {
        if (current) {
          const match = line.match(/@@ -(\d+),(\d+) .+ (\d+)/);
          if (match) {
            current.startLine = parseInt(match[1]);
            current.lineCount = parseInt(match[3]);
          }
        }
      }
    }

    if (current) results.push(current);
    return results;
  }

  mergeResults(vectorResults, textResults, config) {
    const merged = new Map();

    for (const result of vectorResults) {
      const key = result.path || result.id;
      merged.set(key, {
        ...result,
        vectorScore: result.score,
        textScore: 0,
        score: result.score * config.vectorWeight
      });
    }

    for (const result of textResults) {
      const key = result.path || result.id;
      if (merged.has(key)) {
        const existing = merged.get(key);
        existing.textScore = result.score;
        existing.score = existing.vectorScore * config.vectorWeight + result.score * config.textWeight;
      } else {
        merged.set(key, {
          ...result,
          vectorScore: 0,
          textScore: result.score,
          score: result.score * config.textWeight
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  applyMMR(results, lambda) {
    if (results.length <= 1) return results;

    const selected = [results[0]];
    const remaining = results.slice(1);

    while (selected.length < results.length && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = remaining[i].score;
        const diversity = this.maxSimilarity(remaining[i], selected);
        const mmrScore = lambda * relevance - (1 - lambda) * diversity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  maxSimilarity(candidate, selected) {
    let maxSim = 0;
    for (const item of selected) {
      const sim = this.jaccardSimilarity(
        this.tokenize(candidate.path || candidate.content || ''),
        this.tokenize(item.path || item.content || '')
      );
      maxSim = Math.max(maxSim, sim);
    }
    return maxSim;
  }

  tokenize(text) {
    return new Set(text.toLowerCase().split(/[\s\-_:\/\.]+/).filter(t => t.length > 1));
  }

  jaccardSimilarity(setA, setB) {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  applyTemporalDecay(results, halfLifeDays) {
    const now = Date.now();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
    const decayConstant = Math.log(2) / halfLifeMs;

    return results.map(result => {
      const timestamp = result.timestamp || result.indexedAt;
      if (!timestamp) return result;

      const age = now - new Date(timestamp).getTime();
      const decay = Math.exp(-decayConstant * age);

      return {
        ...result,
        originalScore: result.score,
        score: result.score * decay,
        decayFactor: decay
      };
    }).sort((a, b) => b.score - a.score);
  }

  getQueryStats() {
    if (this.queryHistory.length === 0) {
      return { total: 0 };
    }

    const intents = {};
    let totalDuration = 0;

    for (const q of this.queryHistory) {
      intents[q.intent?.type || 'unknown'] = (intents[q.intent?.type || 'unknown'] || 0) + 1;
      totalDuration += q.duration;
    }

    return {
      total: this.queryHistory.length,
      avgDuration: totalDuration / this.queryHistory.length,
      intents,
      recentQueries: this.queryHistory.slice(-5)
    };
  }

  async getStatus() {
    return {
      hybridSearch: this.config.hybridSearch,
      vectorWeight: this.config.vectorWeight,
      textWeight: this.config.textWeight,
      mmrLambda: this.config.mmrLambda,
      temporalDecayHalfLife: this.config.temporalDecayHalfLife,
      queryExpansion: this.config.queryExpansion,
      intentRecognition: this.config.intentRecognition,
      queryStats: this.getQueryStats()
    };
  }
}

export { RetrievalManager };
export default RetrievalManager;
