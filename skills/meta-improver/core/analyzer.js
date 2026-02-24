class Analyzer {
  constructor(config) {
    this.config = config;
    this.thresholds = config?.thresholds || {
      failureRate: 0.20,
      fitness: 0.80,
      memory: 0.90,
      disk: 0.85,
      hooks: 500,
      learningRecords: 10000,
      unresolvedFailures: 100
    };
  }

  analyze(introspection) {
    const issues = [];
    const now = Date.now();

    // Memory issues
    if (introspection.memory.unresolvedFailures > this.thresholds.unresolvedFailures) {
      issues.push({
        id: `unresolved-failures-${now}`,
        type: 'cleanup',
        priority: 'P1',
        category: 'failures',
        severity: introspection.memory.unresolvedFailures / this.thresholds.unresolvedFailures,
        description: `${introspection.memory.unresolvedFailures} unresolved failures`,
        recommendation: 'auto_fix_failures',
        data: { count: introspection.memory.unresolvedFailures }
      });
    }

    // Learning issues
    if (introspection.learning.duplicateRate > 0.10) {
      issues.push({
        id: `learning-duplicates-${now}`,
        type: 'cleanup',
        priority: 'P1',
        category: 'learning',
        severity: introspection.learning.duplicateRate,
        description: `${(introspection.learning.duplicateRate * 100).toFixed(1)}% duplicate learning records`,
        recommendation: 'dedupe_learning_records',
        data: { rate: introspection.learning.duplicateRate, count: introspection.learning.duplicates }
      });
    }

    if (introspection.learning.records > this.thresholds.learningRecords) {
      issues.push({
        id: `learning-overflow-${now}`,
        type: 'optimize',
        priority: 'P2',
        category: 'learning',
        severity: introspection.learning.records / this.thresholds.learningRecords,
        description: `${introspection.learning.records} learning records (threshold: ${this.thresholds.learningRecords})`,
        recommendation: 'crystallize_and_compress',
        data: { count: introspection.learning.records }
      });
    }

    // Fitness issues
    introspection.fitness.lowPerformers.forEach(lp => {
      issues.push({
        id: `fitness-${lp.tool}-${now}`,
        type: 'fix',
        priority: lp.fitness < 0.70 ? 'P0' : 'P1',
        category: 'fitness',
        severity: 1 - lp.fitness,
        description: `Tool ${lp.tool} fitness at ${(lp.fitness * 100).toFixed(1)}%`,
        recommendation: 'create_recovery_hook',
        data: { tool: lp.tool, fitness: lp.fitness, failures: lp.failures }
      });
    });

    // Hook issues
    if (introspection.hooks.total > this.thresholds.hooks) {
      issues.push({
        id: `hooks-excess-${now}`,
        type: 'cleanup',
        priority: 'P1',
        category: 'hooks',
        severity: introspection.hooks.total / this.thresholds.hooks,
        description: `${introspection.hooks.total} hooks (threshold: ${this.thresholds.hooks})`,
        recommendation: 'cleanup_duplicate_hooks',
        data: { total: introspection.hooks.total, duplicates: introspection.hooks.duplicates }
      });
    }

    if (introspection.hooks.duplicateRate > 0.05) {
      issues.push({
        id: `hooks-duplicates-${now}`,
        type: 'cleanup',
        priority: 'P1',
        category: 'hooks',
        severity: introspection.hooks.duplicateRate,
        description: `${(introspection.hooks.duplicateRate * 100).toFixed(1)}% duplicate hooks`,
        recommendation: 'remove_duplicate_hooks',
        data: { rate: introspection.hooks.duplicateRate, hooks: introspection.hooks.duplicateHooks }
      });
    }

    // Resource issues
    if (introspection.resources.memoryUsage > this.thresholds.memory) {
      issues.push({
        id: `memory-high-${now}`,
        type: 'cleanup',
        priority: 'P0',
        category: 'resources',
        severity: introspection.resources.memoryUsage,
        description: `Memory usage at ${(introspection.resources.memoryUsage * 100).toFixed(1)}%`,
        recommendation: 'clear_caches',
        data: { usage: introspection.resources.memoryUsage }
      });
    }

    if (introspection.resources.diskUsage > this.thresholds.disk) {
      issues.push({
        id: `disk-high-${now}`,
        type: 'cleanup',
        priority: 'P1',
        category: 'resources',
        severity: introspection.resources.diskUsage,
        description: `Disk usage at ${(introspection.resources.diskUsage * 100).toFixed(1)}%`,
        recommendation: 'cleanup_old_files',
        data: { usage: introspection.resources.diskUsage }
      });
    }

    // API dependencies
    if (introspection.skills.apiDependencyCount > 0) {
      issues.push({
        id: `api-dependencies-${now}`,
        type: 'enhance',
        priority: 'P3',
        category: 'skills',
        severity: introspection.skills.apiDependencyCount * 0.1,
        description: `${introspection.skills.apiDependencyCount} external API dependencies`,
        recommendation: 'create_local_alternatives',
        data: { dependencies: introspection.skills.apiDependencies }
      });
    }

    // Sort by priority then severity
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
    issues.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.severity - a.severity;
    });

    return {
      timestamp: new Date().toISOString(),
      issueCount: issues.length,
      byPriority: {
        P0: issues.filter(i => i.priority === 'P0').length,
        P1: issues.filter(i => i.priority === 'P1').length,
        P2: issues.filter(i => i.priority === 'P2').length,
        P3: issues.filter(i => i.priority === 'P3').length,
        P4: issues.filter(i => i.priority === 'P4').length
      },
      byCategory: this.groupBy(issues, 'category'),
      issues
    };
  }

  groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key];
      acc[k] = acc[k] || [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  shouldTrigger(analysis, previousAnalysis) {
    if (!previousAnalysis) return analysis.issueCount > 0;

    const newP0 = analysis.byPriority.P0 > (previousAnalysis.byPriority.P0 || 0);
    const newP1 = analysis.byPriority.P1 > (previousAnalysis.byPriority.P1 || 0) + 3;
    const severityIncrease = analysis.issues[0]?.severity > (previousAnalysis.issues[0]?.severity || 0) * 1.2;

    return newP0 || newP1 || severityIncrease;
  }
}

module.exports = { Analyzer };
