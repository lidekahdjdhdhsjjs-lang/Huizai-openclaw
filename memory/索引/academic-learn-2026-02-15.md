# 学术学习记录 - 2026-02-15

## 1. Self-Healing AI Agent 项目发现

### 热门项目

1. **robotframework-selfhealing-agents** (21 ⭐)
   - MarketSquare/robotframework-selfhealing-agents
   - 使用 AI 自动修复失败的 Robot Framework 测试
   - Python

2. **ontology-mcp-self-healing** (11 ⭐)
   - cloudbadal007/ontology-mcp-self-healing
   - 使用 OWL 本体和 MCP 的自愈多智能体系统，数据库模式变化时自动适应
   - Python, LangChain, MCP

3. **ghost** (5 ⭐)
   - tripathiji1312/ghost
   - 本地优先 AI Agent，实时生成和自愈 Python 单元测试
   - 支持 Ollama、Groq、pytest

4. **drakben** (4 ⭐)
   - ahmetdrak/drakben
   - 自主 AI 渗透测试代理，支持自然语言理解
   - 自愈、自进化、多 LLM 支持

5. **self-healing-ai-agent** (4 ⭐)
   - cloudbadal007/self-healing-ai-agent
   - 使用 OWL 本体构建的 AI Agent，抵抗数据库模式变化

## 2. LLM Memory Management 项目发现

### 热门项目

1. **MemMachine** (4527 ⭐) ⭐⭐⭐
   - MemMachine/MemMachine
   - AI Agents 的通用内存层
   - 可扩展、可扩展的内存存储和检索
   - 关键词: knowledge-graph, memory, persistent-memory, personalization

2. **AGiXT** (3152 ⭐) ⭐⭐⭐
   - Josh-XT/AGiXT
   - 动态 AI Agent 自动化平台
   - 自适应内存、智能功能、多功能插件系统

3. **OpenViking** (1350 ⭐) ⭐⭐
   - volcengine/OpenViking
   - 专为 AI Agents 设计的开源上下文数据库
   - 文件系统范式统一管理 memory、resources、skills

4. **openmemory-plus** (17 ⭐)
   - Alenryuichi/openmemory-plus
   - AI Agent 内存管理框架
   - 双层内存架构，智能分类和自动提取

## 3. 技术趋势总结

### Self-Healing 模式
- **错误检测 → LLM 分析 → 自动修复 → 验证循环**
- **本体驱动**: 使用 OWL 本体处理模式变化
- **多智能体协作**: Agent 间的自愈协调

### Memory Management 趋势
- **知识图谱**: MemMachine 使用图结构存储记忆
- **分层架构**: 短期记忆 + 长期记忆
- **持久化**: 跨会话的记忆保持
- **上下文数据库**: OpenViking 的文件范式

## 4. 可借鉴实现

1. **自愈机制**: 在 OpenClaw 中添加 错误捕获→分析→修补→验证 流程
2. **Memory 层**: 考虑使用 MemMachine/OpenViking 架构增强记忆
3. **知识图谱**: 事件关系用图数据库存储

## 5. 技术限制

- ArXiv API 需要通过代理访问（当前 DNS 问题）
- 百度学术搜索未能成功调用
- Brave Search 需要 API Key

---
*使用 curl + GitHub API 成功获取数据*
