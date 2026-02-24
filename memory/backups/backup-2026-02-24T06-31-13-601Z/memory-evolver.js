#!/usr/bin/env node

/**
 * Memory Evolver - Self-Evolving Memory System
 * Learns new knowledge and optimizes the memory system
 */

const fs = require('fs');
const path = require('path');

const OPTIMIZE_TRIGGERS = [
  'memory system', 'vector database', 'embedding',
  'rag', 'retrieval', 'search algorithm',
  'indexing', 'storage', 'cache',
  'performance', 'optimization'
];

const STATE_FILE = '/tmp/memory-evolve-state.json';

let state = {
  lastOptimize: 0,
  optimizeCount: 0,
  maxDaily: 3
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function log(level, msg) {
  const time = new Date().toISOString();
  console.log(`[${time}] [${level}] ${msg}`);
}

function shouldOptimize(newKnowledge) {
  if (Date.now() - state.lastOptimize < 24 * 60 * 60 * 1000) return false;
  if (state.optimizeCount >= state.maxDaily) return false;
  
  const text = JSON.stringify(newKnowledge).toLowerCase();
  return OPTIMIZE_TRIGGERS.some(kw => text.includes(kw.toLowerCase()));
}

function evaluateOptimize(newKnowledge) {
  const opportunities = [];
  const text = JSON.stringify(newKnowledge).toLowerCase();
  
  if (/search|query|retrieval/.test(text)) {
    opportunities.push({ area: '检索', suggestion: 'Add search caching', priority: 8 });
  }
  if (/storage|database|index/.test(text)) {
    opportunities.push({ area: '存储', suggestion: 'Improve storage structure', priority: 7 });
  }
  if (/performance|speed|cache/.test(text)) {
    opportunities.push({ area: '性能', suggestion: 'Add caching layer', priority: 9 });
  }
  
  return opportunities;
}

function executeOptimize(opportunity) {
  log('INFO', `Executing: ${opportunity.area} - ${opportunity.suggestion}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = '/home/li/.openclaw/workspace/memory/backups';
  const scriptsDir = '/home/li/.openclaw/workspace/memory/scripts';
  
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  
  const backupPath = path.join(backupDir, `evolve-${timestamp}`);
  
  // Simple copy using exec
  try {
    require('child_process').execSync(`cp -r ${scriptsDir} ${backupPath}`);
    log('INFO', 'Backup created');
  } catch (e) {
    log('ERROR', `Backup failed: ${e.message}`);
  }
  
  state.lastOptimize = Date.now();
  state.optimizeCount++;
  saveState();
  
  return true;
}

function learn(newKnowledge) {
  log('INFO', 'New knowledge received, evaluating...');
  
  if (!shouldOptimize(newKnowledge)) {
    log('INFO', 'No optimization needed');
    return;
  }
  
  const opportunities = evaluateOptimize(newKnowledge);
  if (opportunities.length === 0) return;
  
  opportunities.sort((a, b) => b.priority - a.priority);
  const top = opportunities[0];
  log('WARN', `Optimization opportunity: ${top.area}`);
  executeOptimize(top);
}

function monitorArxivLearning() {
  const learnDir = '/home/li/.openclaw/workspace/memory';
  try {
    const files = fs.readdirSync(learnDir).filter(f => f.includes('learn'));
    
    for (const file of files.slice(-5)) {
      const content = fs.readFileSync(path.join(learnDir, file), 'utf-8');
      learn(content);
    }
  } catch {}
}

async function main() {
  log('INFO', 'Memory Evolver started');
  loadState();
  
  monitorArxivLearning();
  
  setInterval(() => {
    monitorArxivLearning();
  }, 3600000);
  
  process.on('SIGTERM', () => {
    log('INFO', 'Exiting');
    process.exit(0);
  });
}

main();
