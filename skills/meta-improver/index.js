const Introspector = require('./core/introspector');
const Analyzer = require('./core/analyzer');
const Planner = require('./core/planner');
const Executor = require('./core/executor');
const Validator = require('./core/validator');
const Rollback = require('./core/rollback');
const { History } = require('./core/history');
const { Trigger } = require('./core/trigger');

class MetaImprover {
  constructor(config = {}) {
    this.config = {
      validationTime: 300000,
      maxConcurrentImprovements: 1,
      autoRollback: true,
      ...config
    };

    this.introspector = new Introspector(this.config);
    this.analyzer = new Analyzer(this.config);
    this.planner = new Planner(this.config);
    this.executor = new Executor(this.config);
    this.validator = new Validator(this.config);
    this.rollback = new Rollback(this.config);
    this.history = new History(this.config);

    this.isRunning = false;
    this.currentExecution = null;
    this.lastIntrospection = null;

    this.trigger = new Trigger(this.config, (type, data) => {
      this.handleTrigger(type, data);
    });
  }

  start() {
    if (this.isRunning) return { started: false, reason: 'Already running' };
    
    this.isRunning = true;
    this.trigger.start();
    
    return { started: true, timestamp: new Date().toISOString() };
  }

  stop() {
    this.isRunning = false;
    this.trigger.stop();
    
    return { stopped: true, timestamp: new Date().toISOString() };
  }

  async handleTrigger(type, data) {
    if (!this.isRunning) return;
    if (this.currentExecution) return;

    console.log(`[MetaImprover] Triggered: ${type}`, data);

    try {
      const result = await this.runImprovementCycle(type);
      console.log(`[MetaImprover] Cycle complete:`, result.summary);
    } catch (error) {
      console.error(`[MetaImprover] Cycle failed:`, error.message);
    }
  }

  async runImprovementCycle(triggerType = 'manual') {
    const cycleId = `cycle-${Date.now()}`;
    const startTime = Date.now();

    const introspection = await this.introspector.introspect();
    this.lastIntrospection = introspection;

    const analysis = this.analyzer.analyze(introspection);

    if (analysis.issueCount === 0) {
      return {
        cycleId,
        summary: 'No issues found',
        introspection,
        duration: Date.now() - startTime
      };
    }

    const planResult = this.planner.plan(analysis);
    const prioritizedPlans = this.planner.prioritize(planResult.plans);

    const executions = [];
    const maxPlans = Math.min(this.config.maxConcurrentImprovements, prioritizedPlans.length);

    for (let i = 0; i < maxPlans; i++) {
      const plan = prioritizedPlans[i];
      const execution = await this.executePlan(plan);
      executions.push(execution);
    }

    return {
      cycleId,
      triggerType,
      summary: `${executions.length} improvements executed`,
      issueCount: analysis.issueCount,
      executions,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  async executePlan(plan) {
    this.currentExecution = plan.issueId;

    const beforeSnapshot = await this.validator.takeSnapshot();
    const executionResult = await this.executor.execute(plan);

    if (executionResult.success) {
      await this.validator.waitForValidation();
      const validation = await this.validator.validate(executionResult, beforeSnapshot);

      if (validation.shouldRollback && this.config.autoRollback) {
        await this.rollback.rollback(executionResult.snapshot);
        executionResult.rolledBack = true;
        executionResult.validationScore = validation.score;
      }
    }

    this.history.record({
      issueId: plan.issueId,
      action: plan.action,
      priority: plan.priority,
      description: plan.description,
      success: executionResult.success,
      rolledBack: executionResult.rolledBack || false
    });

    this.currentExecution = null;

    return executionResult;
  }

  async introspect() {
    return this.introspector.introspect();
  }

  async analyze() {
    const introspection = await this.introspect();
    return this.analyzer.analyze(introspection);
  }

  async plan(analysis) {
    return this.planner.plan(analysis || await this.analyze());
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentExecution: this.currentExecution,
      trigger: this.trigger.getStatus(),
      history: this.history.getStats(),
      lastIntrospection: this.lastIntrospection?.timestamp
    };
  }

  getHistory(limit = 10) {
    return this.history.getRecent(limit);
  }

  getMetrics() {
    return this.history.getStats();
  }

  async rollbackTo(snapshotId) {
    return this.rollback.rollback(snapshotId);
  }

  listSnapshots() {
    return this.rollback.listSnapshots();
  }
}

module.exports = { MetaImprover };
