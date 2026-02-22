# GitHub AI Agent 学习笔记 (2026-02-14)

## 热门项目概览

### 1. OpenClaw (193K ⭐)
- **描述**: Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞
- **核心特性**:
  - 本地优先 Gateway 控制平面
  - 多渠道 inbox (WhatsApp, Telegram, Slack, Discord, Signal, iMessage 等)
  - 多 Agent 路由
  - 语音唤醒 + 对话模式
  - Live Canvas
  - First-class tools (browser, canvas, nodes, cron)
- **架构**: TypeScript, Node ≥22
- **文档**: https://docs.openclaw.ai

### 2. AutoGPT (181K ⭐)
- **描述**: AutoGPT is the vision of accessible AI for everyone, to use and to build on.
- **使命**: 提供工具，让人们专注于重要的事情

### 3. LangChain (⭐)
- **描述**: The platform for reliable agents.
- **核心**: LLM 应用开发框架

### 4. Microsoft Semantic Kernel (⭐)
- **描述**: Integrate cutting-edge LLM technology quickly and easily into your apps
- **核心**: 企业级 LLM 集成框架

### 5. CrewAI (44K ⭐)
- **描述**: Framework for orchestrating role-playing, autonomous AI agents.
- **核心**: 多 Agent 协作框架

### 6. SuperAGI (17K ⭐)
- **描述**: A dev-first open source autonomous AI agent framework.
- **核心**: 开发者优先的 Agent 框架

## 关键技术概念

### 自我修复/错误处理
- **OpenClaw**: 多种自愈技能 (self-healer, error-recovery, panic-recovery)
- **Neo**: AI-native runtime with persistent Scene Graph，支持实时自省和变更
- **Error Handling Pattern**: 错误分类 + 自动恢复策略

### Agent 架构设计
- **多 Agent 协作**: CrewAI 的 role-playing + 协作智能
- **路由机制**: OpenClaw 的多 Agent 路由 (inbound → isolated agents)
- **Enterprise 级**: Semantic Kernel 的企业集成能力

### 记忆和状态管理
- **OpenClaw**: 会话模型 (main, group isolation, activation modes)
- **长期记忆**: memory-persist, continuous-learner 技能

### 工具调用和规划
- **OpenClaw**: First-class tools (browser, canvas, nodes, cron, sessions)
- **MCP 协议**: Claude Code 的 Model Context Protocol
- **RAG 集成**: 多个框架支持

## 学习方向

1. **自我修复机制**: 参考 OpenClaw 的 self-healer 模式
2. **多渠道接入**: OpenClaw 的 channel 架构
3. **多 Agent 协作**: CrewAI 的协作框架
4. **企业级集成**: Semantic Kernel 的模式
