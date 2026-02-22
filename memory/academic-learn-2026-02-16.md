# 学术学习记录 - 2026-02-16

## ArXiv 论文搜索结果

### 1. AI Agent 自我修复/自主错误恢复

| 论文 | 日期 | 简介 |
|------|------|------|
| **UniT: Unified Multimodal Chain-of-Thought Test-time Scaling** | 2026-02-12 | 统一多模态 CoT 测试时间扩展，使单一模型能够推理、验证和多轮优化 |
| **Agentic Test-Time Scaling for WebAgents** (CATTS) | 2026-02-12 | 动态分配计算资源，使用不确定性统计进行自我纠错 |
| **CM2: Reinforcement Learning with Checklist Rewards** | 2026-02-12 | 多轮多步智能体工具使用的强化学习，通过检查清单进行自我验证 |

### 2. LLM Memory Management

| 项目 | Stars | 简介 |
|------|-------|------|
| **Memori** | 12,060 | SQL 原生记忆层 for LLMs/Agents |
| **MemOS** | 5,537 | AI 记忆操作系统，支持 OpenClaw/Moltbot/Crawlbot 持久化技能记忆 |
| **MemMachine** | 4,541 | 通用记忆层，可扩展的记忆存储和检索 |
| **Cipher** | 3,513 | 编程代理的的记忆层，兼容 Cursor/Windsurf 等 |

### 3. Self-Healing AI Agent 开源项目

| 项目 | Stars | 简介 |
|------|-------|------|
| **SRE-Agent-App** | 63 | 自主 AI SRE 智能体 for Kubernetes，实现 OODA 循环自愈 |
| **robotframework-selfhealing-agents** | 21 | AI 自动修复 Robot Framework 测试 |
| **ontology-mcp-self-healing** | 11 | 本体驱动自愈系统，数据库模式变化时自动适应 |
| **arkavo-edge** | 10 | Rust 智能体运行时，安全性、主权性、自愈性 |

## 技术趋势分析

### Self-Healing 模式
1. **错误检测 → LLM分析 → 自动修复 → 验证循环**
2. **检查清单验证** (CM2)：将行为分解为细粒度二进制标准
3. **不确定性驱动** (CATTS)：使用熵和投票差异进行动态计算分配

### Memory 趋势
1. **分层架构**：短期工作记忆 + 长期持久记忆
2. **SQL 原生层**：Memori 提供结构化记忆存储
3. **跨任务记忆复用**：MemOS 支持技能记忆进化
4. **知识图谱**：MemMachine 图结构状态管理

### 关键发现
- **MemOS 明确支持 OpenClaw** ✅
- **Self-Healing 在 DevOps/SRE 领域活跃** (K8s 自动修复)
- **Test-time Scaling 是热门方向** (推理时扩展计算资源)

## 待行动
- [ ] 深入研究 MemOS 与 OpenClaw 集成
- [ ] 评估 CATTS 错误恢复模式
- [ ] 探索 SRE-Agent-App 架构
