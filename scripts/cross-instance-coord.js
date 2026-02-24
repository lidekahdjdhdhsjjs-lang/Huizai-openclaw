#!/usr/bin/env node
/**
 * 跨实例协调协议 - Cross-Instance Coordination Protocol
 * 实现亮仔(192.168.1.5)和辉仔(192.168.1.16)之间的协调
 * 
 * 功能:
 *   1. 状态同步
 *   2. 任务分发
 *   3. 故障转移
 *   4. 学习共享
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME, '.openclaw');
const COORD_DIR = path.join(OPENCLAW_DIR, 'workspace', 'memory', 'coordination');
const INSTANCE_FILE = path.join(OPENCLAW_DIR, 'workspace', 'memory', 'instance-state.json');

// 实例配置
const INSTANCES = {
  liangzai: {
    name: '亮仔',
    ip: '192.168.1.5',
    role: 'primary',  // 主实例
    vpnPort: 7897
  },
  huizai: {
    name: '辉仔', 
    ip: '192.168.1.16',
    role: 'secondary',  // 备实例
    vpnPort: 7899
  }
};

// 确定当前实例
function detectCurrentInstance() {
  try {
    const ips = execSync('hostname -I', { encoding: 'utf8' }).trim().split(' ');
    if (ips.includes('192.168.1.5')) return 'liangzai';
    if (ips.includes('192.168.1.16')) return 'huizai';
  } catch (e) {}
  return 'liangzai'; // 默认
}

const CURRENT_INSTANCE = detectCurrentInstance();
const PEER_INSTANCE = CURRENT_INSTANCE === 'liangzai' ? 'huizai' : 'liangzai';

// 确保目录存在
if (!fs.existsSync(COORD_DIR)) {
  fs.mkdirSync(COORD_DIR, { recursive: true });
}

// ============================================
// 状态同步
// ============================================

function getInstanceState() {
  const state = {
    instance: CURRENT_INSTANCE,
    name: INSTANCES[CURRENT_INSTANCE].name,
    role: INSTANCES[CURRENT_INSTANCE].role,
    ip: INSTANCES[CURRENT_INSTANCE].ip,
    timestamp: new Date().toISOString(),
    
    // 系统状态
    system: {},
    
    // 学习状态
    learning: {},
    
    // 任务状态
    tasks: {}
  };

  // 获取系统状态
  try {
    const memInfo = execSync('free -m | grep Mem', { encoding: 'utf8' });
    const parts = memInfo.split(/\s+/);
    state.system.memoryUsage = Math.round((parseInt(parts[2]) / parseInt(parts[1])) * 100);
    state.system.uptime = execSync('uptime -p', { encoding: 'utf8' }).trim();
  } catch (e) {
    state.system.error = e.message;
  }

  // 获取学习状态
  try {
    const learningsFile = path.join(OPENCLAW_DIR, 'foundry', 'learnings.json');
    const learnings = JSON.parse(fs.readFileSync(learningsFile, 'utf8'));
    state.learning.patterns = learnings.length;
    state.learning.crystallized = learnings.filter(l => l.crystallizedTo).length;
  } catch (e) {
    state.learning.error = e.message;
  }

  // 获取任务状态
  try {
    const cronFile = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
    const cron = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
    state.tasks.total = cron.jobs.length;
    state.tasks.enabled = cron.jobs.filter(j => j.enabled).length;
    state.tasks.errors = cron.jobs.filter(j => j.state?.consecutiveErrors > 0).length;
  } catch (e) {
    state.tasks.error = e.message;
  }

  return state;
}

function saveInstanceState(state) {
  fs.writeFileSync(INSTANCE_FILE, JSON.stringify(state, null, 2));
  return state;
}

// ============================================
// 实例发现
// ============================================

function checkPeerStatus() {
  const peer = INSTANCES[PEER_INSTANCE];
  const status = {
    name: peer.name,
    ip: peer.ip,
    reachable: false,
    gatewayRunning: false,
    responseTime: null
  };

  try {
    const start = Date.now();
    execSync(`ping -c 1 -W 2 ${peer.ip}`, { encoding: 'utf8' });
    status.reachable = true;
    status.responseTime = Date.now() - start;

    // 检查Gateway是否运行
    try {
      const result = execSync(
        `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${peer.ip} "pgrep -f 'openclaw.*gateway' || true"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      status.gatewayRunning = result.trim() !== '';
    } catch (e) {
      status.gatewayError = e.message;
    }
  } catch (e) {
    status.error = e.message;
  }

  return status;
}

// ============================================
// 任务分发
// ============================================

function distributeTask(task) {
  const result = {
    success: false,
    assignedTo: null,
    error: null
  };

  // 检查负载，选择较轻的实例
  const myState = getInstanceState();
  const peerStatus = checkPeerStatus();

  // 如果对端不可达，本地执行
  if (!peerStatus.reachable) {
    result.assignedTo = CURRENT_INSTANCE;
    result.reason = 'Peer unreachable';
    return result;
  }

  // 简单负载均衡：内存使用较低的实例优先
  if (myState.system.memoryUsage < 70) {
    result.assignedTo = CURRENT_INSTANCE;
  } else {
    result.assignedTo = PEER_INSTANCE;
  }

  result.success = true;
  return result;
}

// ============================================
// 学习共享
// ============================================

function shareLearnings() {
  const peer = INSTANCES[PEER_INSTANCE];
  const sharedFile = path.join(COORD_DIR, 'shared-learnings.json');
  
  // 收集可共享的学习
  const learningsFile = path.join(OPENCLAW_DIR, 'foundry', 'learnings.json');
  const learnings = JSON.parse(fs.readFileSync(learningsFile, 'utf8'));
  
  const shareable = {
    from: CURRENT_INSTANCE,
    timestamp: new Date().toISOString(),
    patterns: learnings
      .filter(l => l.crystallizedTo && l.useCount >= 5)
      .slice(-10)  // 最近10个结晶模式
      .map(l => ({
        tool: l.tool,
        error: l.error,
        resolution: l.resolution,
        useCount: l.useCount
      }))
  };

  fs.writeFileSync(sharedFile, JSON.stringify(shareable, null, 2));
  
  console.log(`已准备 ${shareable.patterns.length} 个学习模式供共享`);
  
  // 尝试同步到对端
  if (peer.ip) {
    try {
      const remotePath = `${peer.ip}:${COORD_DIR}/from-${CURRENT_INSTANCE}.json`;
      execSync(
        `scp -o ConnectTimeout=5 -o StrictHostKeyChecking=no "${sharedFile}" "${remotePath}"`,
        { encoding: 'utf8', timeout: 15000 }
      );
      console.log(`已同步到 ${peer.name}`);
    } catch (e) {
      console.log(`同步失败: ${e.message}`);
    }
  }

  return shareable;
}

function receiveLearnings() {
  const receivedFile = path.join(COORD_DIR, `from-${PEER_INSTANCE}.json`);
  
  if (!fs.existsSync(receivedFile)) {
    console.log('无新的共享学习');
    return null;
  }

  const received = JSON.parse(fs.readFileSync(receivedFile, 'utf8'));
  console.log(`收到来自 ${received.from} 的 ${received.patterns.length} 个学习模式`);

  // 整合到本地
  const localFile = path.join(OPENCLAW_DIR, 'foundry', 'learnings.json');
  const local = JSON.parse(fs.readFileSync(localFile, 'utf8'));

  let integrated = 0;
  received.patterns.forEach(pattern => {
    // 检查是否已存在
    const exists = local.some(l => 
      l.tool === pattern.tool && 
      l.error === pattern.error
    );
    
    if (!exists) {
      local.push({
        ...pattern,
        id: `shared_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: 'shared',
        source: received.from,
        timestamp: new Date().toISOString()
      });
      integrated++;
    }
  });

  fs.writeFileSync(localFile, JSON.stringify(local, null, 2));
  console.log(`整合了 ${integrated} 个新模式`);

  // 删除已处理的文件
  fs.unlinkSync(receivedFile);

  return { received, integrated };
}

// ============================================
// 故障转移
// ============================================

function checkFailoverNeeded() {
  const peer = INSTANCES[PEER_INSTANCE];
  const status = checkPeerStatus();

  // 如果我是备实例，主实例不可用，需要接管
  if (INSTANCES[CURRENT_INSTANCE].role === 'secondary' && 
      INSTANCES[PEER_INSTANCE].role === 'primary' &&
      !status.reachable) {
    return {
      needed: true,
      reason: 'Primary instance unreachable',
      action: 'takeover'
    };
  }

  // 如果我是主实例，检查是否需要恢复
  if (INSTANCES[CURRENT_INSTANCE].role === 'primary') {
    return {
      needed: false,
      reason: 'Running as primary'
    };
  }

  return { needed: false };
}

// ============================================
// 主函数
// ============================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(`=== 跨实例协调 (${INSTANCES[CURRENT_INSTANCE].name}) ===\n`);

  switch (command) {
    case 'status':
      const state = getInstanceState();
      saveInstanceState(state);
      console.log('实例状态:');
      console.log(JSON.stringify(state, null, 2));
      break;

    case 'peer':
      const peerStatus = checkPeerStatus();
      console.log(`对端状态 (${INSTANCES[PEER_INSTANCE].name}):`);
      console.log(`  IP: ${peerStatus.ip}`);
      console.log(`  可达: ${peerStatus.reachable ? '✅' : '❌'}`);
      if (peerStatus.responseTime) {
        console.log(`  响应时间: ${peerStatus.responseTime}ms`);
      }
      console.log(`  Gateway: ${peerStatus.gatewayRunning ? '运行中 ✅' : '停止 ❌'}`);
      break;

    case 'sync':
      shareLearnings();
      receiveLearnings();
      break;

    case 'failover':
      const failover = checkFailoverNeeded();
      console.log('故障转移检查:');
      console.log(JSON.stringify(failover, null, 2));
      break;

    case 'all':
    default:
      // 执行所有检查
      console.log('1. 本地状态');
      const myState = getInstanceState();
      saveInstanceState(myState);
      console.log(`   内存: ${myState.system.memoryUsage}%`);
      console.log(`   学习模式: ${myState.learning.patterns}`);
      console.log(`   任务: ${myState.tasks.enabled}/${myState.tasks.total}`);

      console.log('\n2. 对端状态');
      const peer = checkPeerStatus();
      console.log(`   可达: ${peer.reachable ? '✅' : '❌'}`);
      console.log(`   Gateway: ${peer.gatewayRunning ? '运行中' : '停止'}`);

      console.log('\n3. 故障转移');
      const fo = checkFailoverNeeded();
      console.log(`   需要: ${fo.needed ? '是' : '否'}`);
      if (fo.reason) console.log(`   原因: ${fo.reason}`);

      // 保存完整协调状态
      const coordState = {
        timestamp: new Date().toISOString(),
        local: myState,
        peer: peer,
        failover: fo
      };
      fs.writeFileSync(
        path.join(COORD_DIR, 'coordination-state.json'),
        JSON.stringify(coordState, null, 2)
      );
  }
}

main();
