#!/usr/bin/env node
/**
 * OpenClaw 学习与进化系统 CLI
 * 统一管理学习和进化功能
 */

import { LearningManager } from './learning/core/manager.js';
import { EvolutionManager } from './evolution/core/manager.js';
import fs from 'fs/promises';
import path from 'path';

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME, '.openclaw');

async function loadConfig() {
    try {
        const configPath = path.join(OPENCLAW_HOME, 'workspace', 'learning', 'config', 'learning-config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const subCommand = args[1];
    const config = await loadConfig();

    const learningManager = new LearningManager(config.learning);
    const evolutionManager = new EvolutionManager(config.evolution);

    await learningManager.initialize();
    await evolutionManager.initialize();

    switch (command) {
        case 'learning':
        case 'learn':
            await handleLearningCommand(learningManager, subCommand, args.slice(2));
            break;
        case 'evolution':
        case 'evolve':
            await handleEvolutionCommand(evolutionManager, subCommand, args.slice(2));
            break;
        case 'status':
            await showStatus(learningManager, evolutionManager);
            break;
        case 'health':
            await showHealth(learningManager, evolutionManager);
            break;
        case 'sync':
            await syncAll(learningManager, evolutionManager);
            break;
        case 'optimize':
            await optimizeAll(learningManager, evolutionManager);
            break;
        case 'help':
        default:
            showHelp();
            break;
    }
}

async function handleLearningCommand(manager, subCommand, args) {
    switch (subCommand) {
        case 'stats':
            console.log(JSON.stringify(manager.getStats(), null, 2));
            break;
        case 'search':
            const query = {
                tool: args.find(a => a.startsWith('--tool='))?.split('=')[1],
                type: args.find(a => a.startsWith('--type='))?.split('=')[1],
                text: args.find(a => !a.startsWith('--'))
            };
            const results = await manager.search(query);
            console.log(JSON.stringify(results.slice(0, 10), null, 2));
            break;
        case 'list':
            const type = args[0];
            let learnings;
            if (type === 'crystallized') {
                learnings = await manager.getCrystallizedPatterns();
            } else if (type === 'pending') {
                learnings = await manager.getPendingPatterns();
            } else {
                learnings = manager.learnings;
            }
            console.log(JSON.stringify(learnings.slice(0, 20), null, 2));
            break;
        case 'top':
            const metric = args[0] || 'useCount';
            const limit = parseInt(args[1]) || 10;
            const top = await manager.getTopLearnings(metric, limit);
            console.log(JSON.stringify(top, null, 2));
            break;
        case 'recent':
            const days = parseInt(args[0]) || 7;
            const recent = await manager.getRecentLearnings(days);
            console.log(JSON.stringify(recent.slice(0, 20), null, 2));
            break;
        case 'cleanup':
            const cleanupResults = await manager.cleanup({ autoArchive: true });
            console.log(JSON.stringify(cleanupResults, null, 2));
            break;
        case 'export':
            const format = args[0] || 'json';
            const exportResults = await manager.export(format);
            console.log(JSON.stringify(exportResults, null, 2));
            break;
        default:
            console.log('Learning commands: stats, search, list, top, recent, cleanup, export');
    }
}

async function handleEvolutionCommand(manager, subCommand, args) {
    switch (subCommand) {
        case 'stats':
            console.log(JSON.stringify(manager.getStats(), null, 2));
            break;
        case 'search':
            const query = {
                type: args.find(a => a.startsWith('--type='))?.split('=')[1],
                minFitness: parseFloat(args.find(a => a.startsWith('--min-fitness='))?.split('=')[1])
            };
            const results = await manager.searchGenes(query);
            console.log(JSON.stringify(results.slice(0, 10), null, 2));
            break;
        case 'top':
            const metric = args[0] || 'fitness';
            const limit = parseInt(args[1]) || 10;
            const top = await manager.getTopPerformers(metric, limit);
            console.log(JSON.stringify(top, null, 2));
            break;
        case 'lineage':
            const geneId = args[0];
            if (!geneId) {
                console.log('Usage: evolution lineage <gene-id>');
                break;
            }
            const lineage = await manager.getLineage(geneId, 5);
            console.log(JSON.stringify(lineage, null, 2));
            break;
        case 'evolve':
            console.log('Running evolution cycle...');
            const evalFn = async (gene) => ({ performance: Math.random(), stability: Math.random(), efficiency: Math.random() });
            const evolveResults = await manager.evolve(evalFn);
            console.log(JSON.stringify(evolveResults, null, 2));
            break;
        case 'cleanup':
            const cleanupResults = await manager.cleanup({ autoArchive: true });
            console.log(JSON.stringify(cleanupResults, null, 2));
            break;
        case 'export':
            const format = args[0] || 'json';
            const exportResults = await manager.exportPopulation(format);
            console.log(JSON.stringify(exportResults, null, 2));
            break;
        default:
            console.log('Evolution commands: stats, search, top, lineage, evolve, cleanup, export');
    }
}

async function showStatus(learningManager, evolutionManager) {
    const learningStats = learningManager.getStats();
    const evolutionStats = evolutionManager.getStats();
    
    console.log('=== OpenClaw System Status ===\n');
    console.log('Learning System:');
    console.log(`  Total Learnings: ${learningStats.total}`);
    console.log(`  Quality Distribution: ${JSON.stringify(learningStats.quality.qualityDistribution)}`);
    console.log(`  Cache Hit Rate: ${(learningStats.performance.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`  Index Entries: ${learningStats.indexer.metadata.totalEntries}`);
    
    console.log('\nEvolution System:');
    console.log(`  Population Size: ${evolutionStats.populationSize}`);
    console.log(`  Current Generation: ${evolutionStats.generation}`);
    console.log(`  Best Fitness: ${evolutionStats.performance.metrics.bestFitness.toFixed(3)}`);
    console.log(`  Avg Fitness: ${evolutionStats.performance.metrics.avgFitness.toFixed(3)}`);
    console.log(`  Convergence Rate: ${(evolutionStats.performance.metrics.convergenceRate * 100).toFixed(1)}%`);
}

async function showHealth(learningManager, evolutionManager) {
    const learningHealth = learningManager.getHealthReport();
    const evolutionHealth = evolutionManager.getHealthReport();
    
    console.log('=== OpenClaw Health Report ===\n');
    console.log(`Learning System: ${learningHealth.status.toUpperCase()}`);
    if (learningHealth.issues.length > 0) {
        learningHealth.issues.forEach(i => console.log(`  - [${i.severity}] ${i.message}`));
    }
    
    console.log(`\nEvolution System: ${evolutionHealth.status.toUpperCase()}`);
    if (evolutionHealth.issues.length > 0) {
        evolutionHealth.issues.forEach(i => console.log(`  - [${i.severity}] ${i.message}`));
    }
}

async function syncAll(learningManager, evolutionManager) {
    console.log('Syncing all systems...');
    const learningSync = await learningManager.sync();
    const evolutionSync = await evolutionManager.sync();
    console.log('Learning sync:', learningSync);
    console.log('Evolution sync:', evolutionSync);
}

async function optimizeAll(learningManager, evolutionManager) {
    console.log('Optimizing all systems...');
    const learningOpt = await learningManager.optimize();
    const evolutionClear = evolutionManager.performance.clearCaches();
    console.log('Learning optimization:', learningOpt);
    console.log('Evolution caches cleared:', evolutionClear);
}

function showHelp() {
    console.log(`
OpenClaw Learning & Evolution System CLI

Usage: node system-cli.js <command> [subcommand] [options]

Commands:
  learning, learn    Learning system operations
    stats            Show learning statistics
    search [query]   Search learnings
    list [type]      List learnings (all/crystallized/pending)
    top [metric]     Show top learnings
    recent [days]    Show recent learnings
    cleanup          Run cleanup
    export [format]  Export learnings

  evolution, evolve  Evolution system operations
    stats            Show evolution statistics
    search [query]   Search genes
    top [metric]     Show top performers
    lineage <id>     Show gene lineage
    evolve           Run evolution cycle
    cleanup          Run cleanup
    export [format]  Export population

  status             Show overall system status
  health             Show health report
  sync               Sync all systems
  optimize           Optimize all systems
  help               Show this help message

Options:
  --tool=<name>      Filter by tool name
  --type=<type>      Filter by type
  --min-fitness=<n>  Minimum fitness threshold

Examples:
  node system-cli.js learning stats
  node system-cli.js learning search --tool=exec --type=failure
  node system-cli.js evolution evolve
  node system-cli.js status
`);
}

main().catch(console.error);
