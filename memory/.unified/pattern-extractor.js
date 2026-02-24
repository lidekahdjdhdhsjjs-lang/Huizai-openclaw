#!/usr/bin/env node
/**
 * 模式提取器 - Pattern Extractor
 * 从工具调用、错误日志、用户反馈中提取可优化的模式
 * 
 * 输入来源:
 *   - foundry/metrics.json (工具健康度)
 *   - foundry/learnings.json (失败模式)
 *   - logs/*.log (运行日志)
 * 
 * 输出:
 *   - 可结晶模式列表
 *   - 优化建议
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const FOUNDRY_DIR = path.join(OPENCLAW_DIR, 'foundry');
const LOGS_DIR = path.join(OPENCLAW_DIR, 'logs');
const OUTPUT_DIR = path.join(OPENCLAW_DIR, 'workspace', 'memory', '.unified', 'L1-structured', 'patterns');

// 阈值配置
const THRESHOLDS = {
  fitness: {
    healthy: 0.9,
    degraded: 0.7,
    critical: 0.5
  },
  pattern: {
    minUseCount: 5,      // 最少出现次数才值得结晶
    maxAge: 30,          // 最大天数
    minImprovement: 0.1  // 最小改进轨迹
  }
};

// ============================================
// 工具健康分析
// ============================================

function analyzeToolHealth() {
  const metricsPath = path.join(FOUNDRY_DIR, 'metrics.json');
  if (!fs.existsSync(metricsPath)) {
    console.log('[WARN] metrics.json not found');
    return { healthy: [], degraded: [], critical: [] };
  }

  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  const analysis = { healthy: [], degraded: [], critical: [] };

  Object.entries(metrics).forEach(([tool, data]) => {
    const fitness = data.fitness || 0;
    const totalCalls = (data.successCount || 0) + (data.failureCount || 0);
    
    const toolInfo = {
      name: tool,
      fitness: Math.round(fitness * 100),
      successCount: data.successCount || 0,
      failureCount: data.failureCount || 0,
      totalCalls,
      failureRate: totalCalls > 0 ? Math.round((data.failureCount / totalCalls) * 100) : 0
    };

    if (fitness >= THRESHOLDS.fitness.healthy) {
      analysis.healthy.push(toolInfo);
    } else if (fitness >= THRESHOLDS.fitness.degraded) {
      analysis.degraded.push(toolInfo);
    } else {
      analysis.critical.push(toolInfo);
    }
  });

  return analysis;
}

// ============================================
// 失败模式提取
// ============================================

function extractFailurePatterns() {
  const learningsPath = path.join(FOUNDRY_DIR, 'learnings.json');
  if (!fs.existsSync(learningsPath)) {
    console.log('[WARN] learnings.json not found');
    return [];
  }

  const learnings = JSON.parse(fs.readFileSync(learningsPath, 'utf8'));
  const patterns = [];

  // 按工具分组
  const byTool = {};
  learnings.forEach(entry => {
    if (entry.type === 'failure' || entry.type === 'pattern') {
      const tool = entry.tool || 'unknown';
      if (!byTool[tool]) byTool[tool] = [];
      byTool[tool].push(entry);
    }
  });

  // 提取可结晶模式
  Object.entries(byTool).forEach(([tool, entries]) => {
    // 按错误类型分组
    const errorGroups = {};
    
    entries.forEach(entry => {
      // 简化错误信息作为key
      const errorKey = (entry.error || 'unknown')
        .slice(0, 100)
        .replace(/[0-9]+/g, 'N')
        .replace(/'.*?'/g, "'...'")
        .replace(/".*?"/g, '"..."');
      
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = {
          key: errorKey,
          tool,
          samples: [],
          useCount: 0,
          resolved: 0,
          improvementTrajectory: []
        };
      }
      
      errorGroups[errorKey].samples.push(entry);
      errorGroups[errorKey].useCount += entry.useCount || 1;
      if (entry.resolution) errorGroups[errorKey].resolved++;
      if (entry.improvementTrajectory) {
        errorGroups[errorKey].improvementTrajectory.push(...entry.improvementTrajectory);
      }
    });

    // 筛选值得结晶的模式
    Object.values(errorGroups).forEach(group => {
      const avgImprovement = group.improvementTrajectory.length > 0
        ? group.improvementTrajectory.reduce((a, b) => a + b, 0) / group.improvementTrajectory.length
        : 0;

      if (group.useCount >= THRESHOLDS.pattern.minUseCount || group.samples.length >= 3) {
        patterns.push({
          id: `pattern_${tool}_${Date.now()}`,
          tool,
          errorPattern: group.key,
          occurrences: group.samples.length,
          useCount: group.useCount,
          resolutionRate: group.samples.length > 0 
            ? Math.round((group.resolved / group.samples.length) * 100) 
            : 0,
          avgImprovement: Math.round(avgImprovement * 100),
          crystallizable: group.useCount >= THRESHOLDS.pattern.minUseCount && 
                         !group.samples.some(s => s.crystallizedTo),
          sampleError: group.samples[0]?.error,
          sampleResolution: group.samples.find(s => s.resolution)?.resolution
        });
      }
    });
  });

  // 按重要性排序
  return patterns.sort((a, b) => 
    (b.useCount * b.occurrences) - (a.useCount * a.occurrences)
  );
}

// ============================================
// 日志分析
// ============================================

function analyzeLogs() {
  const insights = {
    recentErrors: [],
    recurringIssues: []
  };

  if (!fs.existsSync(LOGS_DIR)) return insights;

  const logFiles = fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.log'))
    .slice(0, 5); // 只分析最近的5个日志

  const errorCounts = {};

  logFiles.forEach(logFile => {
    const content = fs.readFileSync(path.join(LOGS_DIR, logFile), 'utf8');
    const lines = content.split('\n').slice(-100); // 每个文件最后100行

    lines.forEach(line => {
      if (line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('fail') ||
          line.toLowerCase().includes('exception')) {
        // 简化错误行
        const key = line.slice(0, 80).replace(/[0-9]+/g, 'N');
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    });
  });

  // 找出重复出现的错误
  insights.recurringIssues = Object.entries(errorCounts)
    .filter(([_, count]) => count >= 2)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return insights;
}

// ============================================
// 生成优化建议
// ============================================

function generateRecommendations(toolHealth, patterns, logInsights) {
  const recommendations = [];

  // 基于工具健康度
  toolHealth.critical.forEach(tool => {
    recommendations.push({
      priority: 'critical',
      type: 'tool_fix',
      tool: tool.name,
      message: `工具 ${tool.name} 健康度仅 ${tool.fitness}%，失败率 ${tool.failureRate}%`,
      action: `检查 ${tool.name} 工具实现，添加重试机制或fallback`
    });
  });

  toolHealth.degraded.forEach(tool => {
    recommendations.push({
      priority: 'high',
      type: 'tool_optimize',
      tool: tool.name,
      message: `工具 ${tool.name} 健康度 ${tool.fitness}%，需要优化`,
      action: `分析失败原因，考虑添加错误处理`
    });
  });

  // 基于失败模式
  patterns.filter(p => p.crystallizable).slice(0, 5).forEach(pattern => {
    recommendations.push({
      priority: 'high',
      type: 'pattern_crystallize',
      tool: pattern.tool,
      message: `发现可结晶模式: ${pattern.errorPattern.slice(0, 50)}...`,
      action: `创建hook自动处理此模式`,
      pattern
    });
  });

  // 基于日志
  logInsights.recurringIssues.slice(0, 3).forEach(issue => {
    recommendations.push({
      priority: 'medium',
      type: 'log_issue',
      message: `日志中发现重复错误 (${issue.count}次)`,
      action: issue.error.slice(0, 100)
    });
  });

  return recommendations;
}

// ============================================
// 主函数
// ============================================

function main() {
  console.log('=== 模式提取器运行 ===\n');

  // 1. 分析工具健康
  console.log('1. 分析工具健康度...');
  const toolHealth = analyzeToolHealth();
  console.log(`   健康: ${toolHealth.healthy.length}`);
  console.log(`   降级: ${toolHealth.degraded.length}`);
  console.log(`   严重: ${toolHealth.critical.length}`);

  // 2. 提取失败模式
  console.log('\n2. 提取失败模式...');
  const patterns = extractFailurePatterns();
  console.log(`   发现模式: ${patterns.length}`);
  console.log(`   可结晶: ${patterns.filter(p => p.crystallizable).length}`);

  // 3. 分析日志
  console.log('\n3. 分析日志...');
  const logInsights = analyzeLogs();
  console.log(`   重复问题: ${logInsights.recurringIssues.length}`);

  // 4. 生成建议
  console.log('\n4. 生成优化建议...');
  const recommendations = generateRecommendations(toolHealth, patterns, logInsights);
  console.log(`   建议: ${recommendations.length}`);

  // 5. 输出结果
  const output = {
    generatedAt: new Date().toISOString(),
    toolHealth,
    patterns: patterns.slice(0, 50), // 只保留前50个
    logInsights,
    recommendations
  };

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, 'extracted-patterns.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n结果已保存: ${outputPath}`);

  // 打印关键发现
  console.log('\n=== 关键发现 ===');
  
  if (toolHealth.critical.length > 0) {
    console.log('\n⚠️ 严重问题工具:');
    toolHealth.critical.forEach(t => 
      console.log(`   - ${t.name}: ${t.fitness}% (失败${t.failureCount}次)`)
    );
  }

  if (patterns.filter(p => p.crystallizable).length > 0) {
    console.log('\n💎 可结晶模式:');
    patterns.filter(p => p.crystallizable).slice(0, 3).forEach(p =>
      console.log(`   - [${p.tool}] ${p.errorPattern.slice(0, 40)}... (出现${p.occurrences}次)`)
    );
  }

  return output;
}

main();
