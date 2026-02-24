#!/usr/bin/env node

/**
 * 智能记忆系统 - 矛盾检测模块
 * 功能: 检测新旧信息冲突,标记可疑内容
 */

const contradictions = [
  { old: '亮仔IP', new: '192.168.1.5', type: 'ip' },
  { old: 'Discord Token', new: '', type: 'removal' },
  { old: 'Supabase URL', new: 'https://yojutfwepfroxozwxzqv.supabase.co', type: 'change' },
];

function detectContradiction(newEntry, existingMemories) {
  const warnings = [];
  
  for (const mem of existingMemories) {
    // IP变化检测
    if (newEntry.includes('IP') && mem.includes('IP')) {
      const newIP = newEntry.match(/\d+\.\d+\.\d+\.\d+/);
      const oldIP = mem.match(/\d+\.\d+\.\d+\.\d+/);
      if (newIP && oldIP && newIP[0] !== oldIP[0]) {
        warnings.push({
          type: 'ip_conflict',
          old: oldIP[0],
          new: newIP[0],
          severity: 'high'
        });
      }
    }
    
    // Token变化检测
    if ((newEntry.includes('Token') || newEntry.includes('token')) && 
        (mem.includes('Token') || mem.includes('token'))) {
      if (newEntry !== mem) {
        warnings.push({
          type: 'token_change',
          severity: 'high',
          suggestion: 'Token已更新,确认是否为本人操作'
        });
      }
    }
  }
  
  return warnings;
}

// 测试
const testNew = '亮仔IP改为192.168.1.99';
const testOld = ['亮仔IP是192.168.1.5', 'Discord Token已更新'];

console.log('=== 矛盾检测测试 ===');
const result = detectContradiction(testNew, testOld);
console.log('检测结果:', result.length ? result : '无冲突 ✅');

module.exports = { detectContradiction };
