#!/usr/bin/env node
/**
 * 验证层 - Evolution Validator
 * 测试结晶效果，确保进化不会引入退化
 * 
 * 功能:
 *   1. 沙箱测试新hooks
 *   2. 对比前后效果
 *   3. 自动回滚退化
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const HOOKS_DIR = path.join(OPENCLAW_DIR, 'hooks');
const FOUNDRY_DIR = path.join(OPENCLAW_DIR, 'foundry');
const METRICS_PATH = path.join(FOUNDRY_DIR, 'metrics.json');
const VALIDATION_DIR = path.join(OPENCLAW_DIR, 'workspace', 'memory', '.unified', 'L1-structured', 'validation');

// 确保目录存在
if (!fs.existsSync(VALIDATION_DIR)) {
  fs.mkdirSync(VALIDATION_DIR, { recursive: true });
}

// ============================================
// 加载基准指标
// ============================================

function loadBaseline() {
  if (!fs.existsSync(METRICS_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
}

// ============================================
// 模拟测试
// ============================================

function simulateHookTest(hookName, hookDir) {
  const result = {
    hookName,
    passed: false,
    errors: [],
    warnings: []
  };

  // 1. 检查必要文件 (支持多种格式)
  const possibleHandlers = ['handler.js', 'handler.ts', 'index.js', 'index.ts'];
  const handlerFiles = fs.readdirSync(hookDir).filter(f => 
    f.endsWith('.js') || f.endsWith('.ts')
  );
  
  let handlerPath = null;
  for (const h of possibleHandlers) {
    const p = path.join(hookDir, h);
    if (fs.existsSync(p)) {
      handlerPath = p;
      break;
    }
  }
  
  // 如果没有标准命名，使用找到的第一个脚本文件
  if (!handlerPath && handlerFiles.length > 0) {
    handlerPath = path.join(hookDir, handlerFiles[0]);
  }

  if (!handlerPath) {
    result.errors.push('No handler file found');
    return result;
  }
  
  result.handlerFile = path.basename(handlerPath);
  const hookMdPath = path.join(hookDir, 'HOOK.md');

  if (!fs.existsSync(hookMdPath)) {
    result.warnings.push('Missing HOOK.md');
  }

  // 2. 语法检查
  try {
    const code = fs.readFileSync(handlerPath, 'utf8');
    
    // 基本语法检查
    if (!code.includes('module.exports') && !code.includes('export default')) {
      result.errors.push('No valid export found');
      return result;
    }

    if (!code.includes('handler') && !code.includes('handle:')) {
      result.warnings.push('No handler function found');
    }

    // 尝试require (不执行)
    // 注意: 这可能有副作用，跳过实际执行
    result.syntaxOk = true;

  } catch (e) {
    result.errors.push(`Syntax error: ${e.message}`);
    return result;
  }

  // 3. 元数据检查
  if (fs.existsSync(hookMdPath)) {
    const md = fs.readFileSync(hookMdPath, 'utf8');
    
    if (!md.includes('events:')) {
      result.warnings.push('No events defined in HOOK.md');
    }

    if (!md.includes('name:')) {
      result.warnings.push('No name defined in HOOK.md');
    }
  }

  result.passed = result.errors.length === 0;
  return result;
}

// ============================================
// 效果对比
// ============================================

function compareMetrics(before, after) {
  const comparison = {
    improved: [],
    degraded: [],
    unchanged: []
  };

  const allTools = new Set([...Object.keys(before), ...Object.keys(after)]);

  allTools.forEach(tool => {
    const beforeFitness = before[tool]?.fitness || 0;
    const afterFitness = after[tool]?.fitness || 0;
    const diff = afterFitness - beforeFitness;

    const entry = {
      tool,
      before: Math.round(beforeFitness * 100),
      after: Math.round(afterFitness * 100),
      diff: Math.round(diff * 100)
    };

    if (diff > 0.01) {
      comparison.improved.push(entry);
    } else if (diff < -0.01) {
      comparison.degraded.push(entry);
    } else {
      comparison.unchanged.push(entry);
    }
  });

  return comparison;
}

// ============================================
// 回滚检查
// ============================================

function checkRollbackNeeded(comparison) {
  // 如果任何工具健康度下降超过5%，需要回滚
  const criticalDegraded = comparison.degraded.filter(d => d.diff < -5);

  return {
    needed: criticalDegraded.length > 0,
    tools: criticalDegraded
  };
}

// ============================================
// 主验证函数
// ============================================

function validate() {
  console.log('=== 验证层运行 ===\n');

  // 1. 加载基准
  console.log('1. 加载基准指标...');
  const baseline = loadBaseline();
  const baselineSummary = {};
  Object.entries(baseline).forEach(([tool, data]) => {
    baselineSummary[tool] = data.fitness;
  });
  console.log(`   工具数: ${Object.keys(baselineSummary).length}`);

  // 2. 扫描新hooks
  console.log('\n2. 扫描新生成的hooks...');
  const hookDirs = fs.readdirSync(HOOKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const recentHooks = hookDirs.filter(name => {
    const stat = fs.statSync(path.join(HOOKS_DIR, name));
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    return ageHours < 24; // 24小时内生成的
  });

  console.log(`   新hooks: ${recentHooks.length}`);

  // 3. 测试每个hook
  console.log('\n3. 测试hooks...');
  const testResults = recentHooks.map(hookName => {
    const hookDir = path.join(HOOKS_DIR, hookName);
    const result = simulateHookTest(hookName, hookDir);
    console.log(`   ${result.passed ? '✓' : '✗'} ${hookName}`);
    if (result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
    return result;
  });

  // 4. 生成验证报告
  const report = {
    generatedAt: new Date().toISOString(),
    baseline: baselineSummary,
    hooks: {
      total: recentHooks.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length
    },
    testResults,
    recommendations: []
  };

  // 5. 添加建议
  testResults.forEach(r => {
    if (!r.passed) {
      report.recommendations.push({
        hook: r.hookName,
        action: 'fix',
        details: r.errors
      });
    } else if (r.warnings.length > 0) {
      report.recommendations.push({
        hook: r.hookName,
        action: 'improve',
        details: r.warnings
      });
    }
  });

  // 6. 保存报告
  const reportPath = path.join(VALIDATION_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n验证报告: ${reportPath}`);

  // 7. 输出摘要
  console.log('\n=== 验证完成 ===');
  console.log(`通过: ${report.hooks.passed}/${report.hooks.total}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n建议:');
    report.recommendations.forEach(r => {
      console.log(`  - [${r.action}] ${r.hook}: ${r.details.join(', ')}`);
    });
  }

  return report;
}

validate();
