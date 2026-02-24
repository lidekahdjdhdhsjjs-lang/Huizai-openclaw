#!/usr/bin/env node

/**
 * 智能对话摘要 - 自动记忆系统
 * 功能: 每天自动总结对话,使用重要性过滤和矛盾检测
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { evaluateImportance, shouldRemember } from './importance-filter.js';
import { detectContradiction } from './contradiction-detector.js';

const MEMORY_DIR = '/home/li/.openclaw/workspace/memory';
const SESSIONS_DIR = '/home/li/.openclaw/agents/main/sessions';
const OUTPUT_FILE = join(MEMORY_DIR, '对话历史', `${getDateString()}.md`);

// 获取今日日期
function getDateString() {
  return new Date().toISOString().split('T')[0];
}

// 从session文件提取对话
function extractConversations(sessionDir) {
  const conversations = [];
  
  try {
    const files = readdirSync(sessionDir).filter(f => f.endsWith('.jsonl'));
    
    for (const file of files) {
      const filePath = join(sessionDir, file);
      const stats = statSync(filePath);
      
      // 只处理今天的文件
      const today = getDateString();
      if (!file.includes(today)) continue;
      
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'message' && entry.message) {
            const role = entry.message.role;
            const text = extractText(entry.message.content);
            if (text && text.length > 10) {
              conversations.push({ role, text, timestamp: entry.timestamp });
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('提取对话失败:', e.message);
  }
  
  return conversations;
}

// 提取消息文本
function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => c.text || c.content || '').join('');
  }
  return content.text || content.content || '';
}

// 提取关键信息
function extractKeyInfo(conversations) {
  const important = [];
  const userQs = [];
  const botRs = [];
  
  for (const msg of conversations) {
    const score = evaluateImportance(msg.text);
    
    if (shouldRemember(msg.text, 0.3)) {
      important.push({ ...msg, score });
    }
    
    if (msg.role === 'user') {
      userQs.push(msg.text.substring(0, 200));
    } else {
      botRs.push(msg.text.substring(0, 200));
    }
  }
  
  return { important, userQs, botRs };
}

// 检查与旧记忆的矛盾
function checkContradictions(newInfo) {
  const warnings = [];
  const oldMemories = [
    '亮仔IP是192.168.1.5',
    'Discord Token已配置',
    'Supabase已配置'
  ];
  
  for (const info of newInfo) {
    const result = detectContradiction(info.text, oldMemories);
    warnings.push(...result);
  }
  
  return warnings;
}

// 生成摘要
function generateSummary(conversations, keyInfo) {
  const date = getDateString();
  const warnings = checkContradictions(keyInfo.important);
  
  let md = `# 对话摘要 - ${date}\n\n`;
  
  // 警告
  if (warnings.length > 0) {
    md += `## ⚠️ 矛盾检测\n`;
    for (const w of warnings) {
      md += `- **${w.type}**: ${w.old} → ${w.new}\n`;
    }
    md += '\n';
  }
  
  // 重要信息
  md += `## 🎯 重要信息 (${keyInfo.important.length}条)\n\n`;
  for (const info of keyInfo.important.slice(0, 10)) {
    md += `### ${info.role === 'user' ? '👤 用户' : '🤖 系统'}\n`;
    md += `${info.text.substring(0, 500)}\n\n`;
    md += `**重要性:** ${(info.score * 100).toFixed(0)}%\n\n---\n\n`;
  }
  
  // 用户问题
  if (keyInfo.userQs.length > 0) {
    md += `## ❓ 用户问题 (${keyInfo.userQs.length}个)\n\n`;
    for (const q of keyInfo.userQs.slice(0, 5)) {
      md += `- ${q.substring(0, 100)}...\n`;
    }
    md += '\n';
  }
  
  // 统计
  md += `## 📊 统计\n`;
  md += `- 总消息数: ${conversations.length}\n`;
  md += `- 重要信息: ${keyInfo.important.length}\n`;
  md += `- 用户问题: ${keyInfo.userQs.length}\n`;
  md += `- 过滤掉: ${conversations.length - keyInfo.important.length}\n`;
  
  // 元数据
  md += `\n---\n`;
  md += `*生成时间: ${new Date().toISOString()}*\n`;
  md += `*重要性阈值: 0.3*\n`;
  
  return md;
}

// 主函数
async function main() {
  console.log('=== 智能对话摘要 ===');
  console.log(`日期: ${getDateString()}`);
  
  // 1. 提取今日对话
  console.log('1. 提取对话中...');
  const conversations = extractConversations(SESSIONS_DIR);
  console.log(`   找到 ${conversations.length} 条消息`);
  
  if (conversations.length === 0) {
    console.log('无新对话,跳过');
    return;
  }
  
  // 2. 提取关键信息
  console.log('2. 评估重要性中...');
  const keyInfo = extractKeyInfo(conversations);
  console.log(`   重要信息: ${keyInfo.important.length}条`);
  console.log(`   过滤掉: ${conversations.length - keyInfo.important.length}条`);
  
  // 3. 检测矛盾
  console.log('3. 检测矛盾中...');
  const warnings = checkContradictions(keyInfo.important);
  if (warnings.length > 0) {
    console.log(`   ⚠️ 发现 ${warnings.length} 个矛盾`);
  }
  
  // 4. 生成摘要
  console.log('4. 生成摘要中...');
  const summary = generateSummary(conversations, keyInfo);
  
  // 5. 保存
  console.log(`5. 保存到 ${OUTPUT_FILE}`);
  ensureDir(join(MEMORY_DIR, '对话历史'));
  writeFileSync(OUTPUT_FILE, summary, 'utf-8');
  
  console.log('✅ 完成!');
}

// 确保目录存在
function ensureDir(dir) {
  try {
    const { mkdirSync } = require('fs');
    mkdirSync(dir, { recursive: true });
  } catch (e) {}
}

main().catch(console.error);
