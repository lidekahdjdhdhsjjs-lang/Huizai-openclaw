const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class GitAnalyzer {
  constructor(repoPath) {
    this.repoPath = repoPath || process.cwd();
    this.cache = new Map();
    this.cacheTTL = 300000;
  }

  async exec(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, { cwd: this.repoPath });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);
      proc.on('close', code => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr || `git ${args.join(' ')} failed`));
      });
    });
  }

  cached(key, fn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.value;
    }
    return fn().then(value => {
      this.cache.set(key, { value, time: Date.now() });
      return value;
    });
  }

  async status() {
    return this.cached('status', async () => {
      const output = await this.exec(['status', '--porcelain']);
      const files = output.split('\n').filter(Boolean).map(line => ({
        status: line.slice(0, 2).trim(),
        path: line.slice(3)
      }));
      return {
        branch: await this.exec(['branch', '--show-current']),
        files,
        staged: files.filter(f => f.status.match(/^[MADRC]/)),
        unstaged: files.filter(f => f.status.match(/^.[MADRC]/)),
        untracked: files.filter(f => f.status === '??')
      };
    });
  }

  async log(options = {}) {
    const limit = options.limit || 50;
    const format = '--format=%H|%h|%an|%ae|%at|%s';
    const output = await this.exec(['log', `-${limit}`, format]);
    
    return output.split('\n').filter(Boolean).map(line => {
      const [hash, shortHash, author, email, timestamp, message] = line.split('|');
      return { hash, shortHash, author, email, date: new Date(parseInt(timestamp) * 1000), message };
    });
  }

  async diff(options = {}) {
    const args = ['diff'];
    if (options.staged) args.push('--staged');
    if (options.file) args.push('--', options.file);
    if (options.commit) args.push(options.commit);
    return this.exec(args);
  }

  async blame(file) {
    const output = await this.exec(['blame', '-w', '-M', '-C', '--line-porcelain', file]);
    const lines = [];
    let current = {};
    
    output.split('\n').forEach(line => {
      if (line.startsWith('author ')) current.author = line.slice(7);
      else if (line.startsWith('author-mail ')) current.email = line.slice(12);
      else if (line.startsWith('author-time ')) current.time = new Date(parseInt(line.slice(12)) * 1000);
      else if (line.match(/^\w{40}/)) {
        if (current.author) lines.push({ ...current });
        current = { hash: line.split(' ')[0] };
      }
    });
    
    return lines;
  }

  async contributors() {
    const output = await this.exec(['shortlog', '-sne', 'HEAD']);
    return output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^\s*(\d+)\s+(.+)\s+<(.+)>/);
      return { commits: parseInt(match[1]), name: match[2], email: match[3] };
    });
  }

  async recentActivity(days = 7) {
    const since = `--since=${days}.days.ago`;
    const log = await this.exec(['log', since, '--format=%H|%an|%at|%s']);
    const commits = log.split('\n').filter(Boolean).map(line => {
      const [hash, author, timestamp, message] = line.split('|');
      return { hash, author, date: new Date(parseInt(timestamp) * 1000), message };
    });
    
    const files = await this.exec(['diff', '--stat', since]);
    const changes = files.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^\s*(.+)\s+\|\s+(\d+)/);
      if (match) return { file: match[1], changes: parseInt(match[2]) };
    }).filter(Boolean);
    
    return { commits, changes, summary: { totalCommits: commits.length, totalFiles: changes.length } };
  }

  async branches() {
    const output = await this.exec(['branch', '-a', '--format=%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(upstream:short)']);
    return output.split('\n').filter(Boolean).map(line => {
      const [name, hash, date, upstream] = line.split('|');
      return { name, hash, lastCommit: date, upstream, isRemote: name.startsWith('origin/') };
    });
  }

  async tags() {
    const output = await this.exec(['tag', '-l', '--format=%(refname:short)|%(objectname:short)|%(creatordate:iso)']);
    return output.split('\n').filter(Boolean).map(line => {
      const [name, hash, date] = line.split('|');
      return { name, hash, created: date };
    });
  }

  async search(query, options = {}) {
    const args = ['log', '--all', '--oneline', '--grep', query];
    if (options.author) args.push('--author', options.author);
    if (options.since) args.push('--since', options.since);
    const output = await this.exec(args);
    
    return output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(\w+)\s+(.+)$/);
      return { hash: match[1], message: match[2] };
    });
  }

  async stats() {
    const [totalCommits, contributors, branches, tags] = await Promise.all([
      this.exec(['rev-list', '--count', 'HEAD']).then(Number),
      this.contributors().then(c => c.length),
      this.branches().then(b => b.length),
      this.tags().then(t => t.length)
    ]);
    
    return { totalCommits, contributors, branches, tags };
  }
}

module.exports = { GitAnalyzer };
