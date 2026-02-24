#!/usr/bin/env node
/**
 * OpenClaw 记忆系统 CLI
 * 统一命令行接口
 */

import { MemoryManager } from './core/memory-manager.js';

const args = process.argv.slice(2);
const command = args[0] || 'status';

async function main() {
  const manager = new MemoryManager();
  await manager.initialize();

  switch (command) {
    case 'status':
      const status = await manager.getStatus();
      console.log('\n🧠 OpenClaw 记忆系统状态\n');
      console.log('=== 安全模块 ===');
      console.log(JSON.stringify(status.security, null, 2));
      console.log('\n=== 性能模块 ===');
      console.log(JSON.stringify(status.performance, null, 2));
      console.log('\n=== 质量模块 ===');
      console.log(JSON.stringify(status.quality, null, 2));
      console.log('\n=== 索引模块 ===');
      console.log(JSON.stringify(status.indexer, null, 2));
      console.log('\n=== 检索模块 ===');
      console.log(JSON.stringify(status.retrieval, null, 2));
      console.log('\n=== 生命周期模块 ===');
      console.log(JSON.stringify(status.lifecycle, null, 2));
      console.log('\n=== 自动化模块 ===');
      console.log(JSON.stringify(status.automation, null, 2));
      console.log('\n=== 集成模块 ===');
      console.log(JSON.stringify(status.integration, null, 2));
      break;

    case 'search':
      const query = args[1];
      if (!query) {
        console.log('用法: memory-cli.js search <查询>');
        break;
      }
      const results = await manager.search(query);
      console.log(`\n🔍 搜索: "${query}"\n`);
      console.log(`找到 ${results.results.length} 条结果 (${results.meta.duration}ms)\n`);
      for (const r of results.results.slice(0, 5)) {
        console.log(`- [${r.score.toFixed(2)}] ${r.title || r.path}`);
      }
      break;

    case 'write':
      const content = args[1];
      if (!content) {
        console.log('用法: memory-cli.js write <内容>');
        break;
      }
      const written = await manager.write({ content });
      console.log('\n✅ 记忆已写入\n');
      console.log(JSON.stringify(written, null, 2));
      break;

    case 'health':
      const health = await manager.indexer.healthCheck();
      console.log('\n🏥 健康检查\n');
      console.log(`状态: ${health.healthy ? '✅ 健康' : '❌ 有问题'}`);
      if (health.issues.length > 0) {
        console.log('\n问题:');
        for (const issue of health.issues) {
          console.log(`  [${issue.severity}] ${issue.message}`);
        }
      }
      break;

    case 'sync':
      console.log('\n🔄 同步数据...\n');
      await manager.integration.syncFoundry();
      await manager.integration.syncSessions();
      console.log('✅ 同步完成');
      break;

    case 'cleanup':
      console.log('\n🧹 清理过期记忆...\n');
      await manager.lifecycle.runCleanup();
      console.log('✅ 清理完成');
      break;

    case 'reindex':
      console.log('\n📊 重建索引...\n');
      await manager.indexer.rebuildIndex();
      console.log('✅ 索引重建完成');
      break;

    case 'clear-cache':
      manager.performance.clearCache();
      console.log('\n✅ 缓存已清除');
      break;

    default:
      console.log(`
🧠 OpenClaw 记忆系统 CLI

用法: memory-cli.js <命令> [参数]

命令:
  status          显示系统状态
  search <查询>   搜索记忆
  write <内容>    写入记忆
  health          健康检查
  sync            同步外部数据
  cleanup         清理过期记忆
  reindex         重建索引
  clear-cache     清除缓存
`);
  }
}

main().catch(console.error);
