const path = require('path');
const fs = require('fs');

class Planner {
  constructor(config) {
    this.config = config;
    this.actionsDir = path.join(__dirname, '..', 'actions');
  }

  plan(analysis) {
    const plans = [];

    for (const issue of analysis.issues) {
      const plan = this.createPlan(issue);
      if (plan) plans.push(plan);
    }

    return {
      timestamp: new Date().toISOString(),
      totalPlans: plans.length,
      estimatedTime: plans.reduce((sum, p) => sum + (p.estimatedTime || 0), 0),
      plans
    };
  }

  createPlan(issue) {
    const planTemplates = {
      'auto_fix_failures': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'failures',
        steps: [
          { type: 'load', file: '~/.openclaw/foundry/failures/*.json' },
          { type: 'filter', condition: '!resolved' },
          { type: 'analyze', handler: 'failure-analyzer' },
          { type: 'fix', auto: true },
          { type: 'save' }
        ],
        estimatedTime: 30000,
        risk: 'low'
      }),

      'dedupe_learning_records': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'learning',
        steps: [
          { type: 'load', file: '~/.openclaw/foundry/learning.json' },
          { type: 'dedupe', keys: ['skill', 'outcome'] },
          { type: 'save' }
        ],
        estimatedTime: 10000,
        risk: 'low',
        expectedReduction: issue.data?.rate || 0.1
      }),

      'crystallize_and_compress': () => ({
        issueId: issue.id,
        action: 'optimize',
        target: 'learning',
        steps: [
          { type: 'load', file: '~/.openclaw/foundry/learning.json' },
          { type: 'crystallize', minAge: 7 * 24 * 3600000 },
          { type: 'compress', keepRecent: 1000 },
          { type: 'save' }
        ],
        estimatedTime: 60000,
        risk: 'medium'
      }),

      'create_recovery_hook': () => ({
        issueId: issue.id,
        action: 'create',
        target: 'hook',
        steps: [
          { type: 'template', name: 'recovery-hook' },
          { type: 'customize', tool: issue.data?.tool },
          { type: 'write', path: `~/.openclaw/foundry/hooks/auto-recovery-${issue.data?.tool}.ts` }
        ],
        estimatedTime: 5000,
        risk: 'low',
        template: 'recovery-hook',
        data: { tool: issue.data?.tool }
      }),

      'cleanup_duplicate_hooks': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'hooks',
        steps: [
          { type: 'scan', dir: '~/.openclaw/foundry/hooks' },
          { type: 'identify_duplicates', by: 'content_signature' },
          { type: 'delete_duplicates', keepNewest: true },
          { type: 'report' }
        ],
        estimatedTime: 15000,
        risk: 'low',
        expectedDeletion: issue.data?.duplicates || 0
      }),

      'remove_duplicate_hooks': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'hooks',
        steps: [
          { type: 'load_list', hooks: issue.data?.hooks || [] },
          { type: 'delete', keepFirst: true }
        ],
        estimatedTime: 5000,
        risk: 'low'
      }),

      'clear_caches': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'cache',
        steps: [
          { type: 'find', pattern: '~/.openclaw/**/cache/**' },
          { type: 'delete', olderThan: 24 * 3600000 },
          { type: 'gc' }
        ],
        estimatedTime: 10000,
        risk: 'low'
      }),

      'cleanup_old_files': () => ({
        issueId: issue.id,
        action: 'cleanup',
        target: 'files',
        steps: [
          { type: 'find', pattern: '~/.openclaw/**/*.log' },
          { type: 'delete', olderThan: 7 * 24 * 3600000 },
          { type: 'find', pattern: '~/.openclaw/**/tmp/**' },
          { type: 'delete' }
        ],
        estimatedTime: 15000,
        risk: 'low'
      }),

      'create_local_alternatives': () => ({
        issueId: issue.id,
        action: 'create',
        target: 'skill',
        steps: [
          { type: 'analyze_apis', dependencies: issue.data?.dependencies },
          { type: 'prioritize', by: 'usage_frequency' },
          { type: 'template', name: 'local-skill' },
          { type: 'implement', auto: true },
          { type: 'write', path: '~/.openclaw/workspace/skills/local-{name}/' }
        ],
        estimatedTime: 300000,
        risk: 'medium',
        template: 'local-skill'
      })
    };

    const template = planTemplates[issue.recommendation];
    if (!template) return null;

    return {
      ...template(),
      priority: issue.priority,
      category: issue.category,
      description: issue.description
    };
  }

  prioritize(plans) {
    const priorityWeight = { 'P0': 100, 'P1': 75, 'P2': 50, 'P3': 25, 'P4': 10 };
    const riskWeight = { 'low': 1.0, 'medium': 0.7, 'high': 0.4 };

    return plans.map(plan => ({
      ...plan,
      score: priorityWeight[plan.priority] * riskWeight[plan.risk || 'low']
    })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { Planner };
