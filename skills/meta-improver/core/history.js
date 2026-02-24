const fs = require('fs');
const path = require('path');

class History {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
    this.historyFile = path.join(this.openclawDir, 'workspace', 'meta-improver', 'history.json');
    this.metricsFile = path.join(this.openclawDir, 'workspace', 'meta-improver', 'metrics.json');
    this.ensureFiles();
  }

  ensureFiles() {
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.historyFile)) fs.writeFileSync(this.historyFile, '[]');
    if (!fs.existsSync(this.metricsFile)) {
      fs.writeFileSync(this.metricsFile, JSON.stringify({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        rollbacks: 0,
        byType: {},
        byPriority: {}
      }, null, 2));
    }
  }

  record(entry) {
    const history = this.load();
    history.push({
      ...entry,
      recordedAt: new Date().toISOString()
    });
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    this.updateMetrics(entry);
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
    } catch {
      return [];
    }
  }

  updateMetrics(entry) {
    const metrics = this.loadMetrics();
    metrics.totalExecutions++;

    if (entry.success) metrics.successfulExecutions++;
    else metrics.failedExecutions++;

    if (entry.rolledBack) metrics.rollbacks++;

    const type = entry.action || 'unknown';
    metrics.byType[type] = (metrics.byType[type] || 0) + 1;

    const priority = entry.priority || 'unknown';
    metrics.byPriority[priority] = (metrics.byPriority[priority] || 0) + 1;

    metrics.lastExecution = entry.recordedAt || new Date().toISOString();

    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  loadMetrics() {
    try {
      return JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8'));
    } catch {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        rollbacks: 0,
        byType: {},
        byPriority: {}
      };
    }
  }

  getRecent(limit = 10) {
    const history = this.load();
    return history.slice(-limit).reverse();
  }

  getByType(type) {
    const history = this.load();
    return history.filter(h => h.action === type);
  }

  getByDateRange(start, end) {
    const history = this.load();
    return history.filter(h => {
      const date = new Date(h.recordedAt);
      return date >= new Date(start) && date <= new Date(end);
    });
  }

  getStats() {
    const history = this.load();
    const metrics = this.loadMetrics();

    const last7Days = history.filter(h => {
      const date = new Date(h.recordedAt);
      return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });

    return {
      ...metrics,
      recentActivity: last7Days.length,
      successRate: metrics.totalExecutions > 0
        ? (metrics.successfulExecutions / metrics.totalExecutions * 100).toFixed(1) + '%'
        : 'N/A',
      rollbackRate: metrics.totalExecutions > 0
        ? (metrics.rollbacks / metrics.totalExecutions * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  search(query) {
    const history = this.load();
    const q = query.toLowerCase();
    return history.filter(h =>
      (h.description || '').toLowerCase().includes(q) ||
      (h.action || '').toLowerCase().includes(q) ||
      (h.issueId || '').toLowerCase().includes(q)
    );
  }

  export(format = 'json') {
    const history = this.load();
    if (format === 'csv') {
      const headers = ['timestamp', 'action', 'success', 'priority', 'description'];
      const rows = history.map(h => [
        h.recordedAt,
        h.action,
        h.success,
        h.priority,
        h.description
      ].join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    return JSON.stringify(history, null, 2);
  }
}

module.exports = { History };
