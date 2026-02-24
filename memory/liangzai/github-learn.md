# GitHub AI 学习: Self-Healing Agent

日期: 2026-02-24

## 概述
Self-healing agent 是能够自动检测、诊断并修复错误的AI代理系统。

## 主要开源项目

### 1. Neo.mjs (⭐3,138) - AI原生应用引擎
- **仓库**: neomjs/neo
- **语言**: JavaScript
- **功能**: 多线程AI原生运行时，支持AI代理实时自愈
- **特点**:
  - 持久化场景图 (Persistent Scene Graph)
  - Neural Link: AI可以直接查询和修改运行时状态
  - MCP服务器: Knowledge Base, Memory Core, GitHub Workflow
  - Agent Runtime: 自主执行代码修复、自动化重构
  - **核心自愈机制**: AI可以热修补类方法、修改状态、实时验证修复

### 2. SRE-Agent-App (⭐63) - K8s自动运维
- **仓库**: qicesun/SRE-Agent-App
- **语言**: Java (Spring Boot + LangChain4j)
- **功能**: 自主SRE代理，实现OODA循环自愈
- **特点**:
  - **OODA Loop**: Observe → Orient → Decide → Act
  - K8s深度集成: 检查pod状态、获取日志、滚动重启
  - GitLab集成: 关联堆栈跟踪与代码变更
  - Jira集成: 自动创建事件单
  - Web抓取: 获取错误文档和故障排除指南

### 3. NetworkOps Platform (⭐70) - MCP网络自动化
- **仓库**: E-Conners-Lab/NetworkOps_Platform
- **语言**: Python
- **功能**: MCP协议AI网络自动化
- **特点**:
  - 178个多厂商网络管理工具
  - 自愈代理
  - 漂移检测
  - 实时Web仪表板

### 4. Sentinel (⭐383) - 边缘计算自愈
- **仓库**: aqstack/sentinel
- **语言**: Go
- **功能**: K8s预测性故障检测和分区弹性编排
- **特点**:
  - 预测性故障检测
  - 分区弹性编排
  - 边缘计算优化

### 5. Robot Framework Selfhealing Agents
- **仓库**: MarketSquare/robotframework-selfhealing-agents
- **语言**: Python
- **功能**: 使用LLM自动修复失败的Robot Framework测试
- **特点**:
  - 自动修复损坏的locator
  - 支持Browser & Selenium
  - 支持OpenAI、Azure OpenAI、LiteLLM
  - 生成修复报告和diff

### 6. Agentic Reliability Framework (ARF)
- **仓库**: petterjuan/agentic-reliability-framework
- **语言**: Python
- **许可证**: Apache 2.0 (OSS) + Enterprise
- **功能**: 基础设施可靠性分析和执行智能
- **特点**:
  - 双架构: OSS分析 + Enterprise执行
  - 事件摄取 → 多阶段分析 → 历史模式召回 → 咨询规划
  - 不自动执行（OSS版本仅提供建议）

### 7. 其他新兴项目
- **codecflow/fabric** (⭐12): Go编排服务，为AI代理提供安全的自愈虚拟OS环境
- **arkavo-org/arkavo-edge** (⭐10): Rust代理运行时，安全、自主权、自愈AI
- **phamdaiminhquan/vibe-devops** (⭐14): AI终端代理，VPS管理和自愈Docker部署
- **ahmetdrak/drakben** (⭐5): 自主AI渗透测试 agent，多LLM支持自愈自进化

### 8. vibe-devops (⭐14) - VPS自愈管理
- **仓库**: phamdaiminhquan/vibe-devops
- **语言**: Go
- **功能**: AI终端代理，自动化VPS管理和自愈Docker部署
- **特点**:
  - Docker容器健康监控
  - 自动重启失败容器
  - VPS资源管理

### 9. self-healing-agent (⭐12) - 任务递归修复
- **仓库**: 自建项目
- **语言**: Python
- **功能**: 递归分解任务，编写测试，执行任务直到测试通过
- **特点**:
  - 任务自动分解
  - 测试驱动修复
  - 循环验证直到成功

### 10. fabric (⭐12) - 虚拟OS编排
- **仓库**: codecflow/fabric
- **语言**: Go
- **功能**: 为AI代理提供安全、资源管理、自愈的虚拟OS环境
- **特点**:
  - 隔离执行环境
  - 资源限制和保护
  - 自愈机制

### 11. uv-mcp (⭐12) - Python环境自愈
- **仓库**: astral-sh/uv-mcp
- **语言**: Python
- **功能**: 桥接现代Python环境与MCP代理，诊断和自愈uv工作流
- **特点**:
  - uv环境诊断
  - 自动修复依赖问题
  - MCP协议集成

### 12. ontology-mcp-self-healing (⭐11) - 本体自愈
- **仓库**: 自建项目
- **语言**: Python
- **功能**: 使用本体和MCP的自愈多代理系统，数据库模式变化时自动适应
- **特点**:
  - OWL本体推理
  - 模式变化检测
  - 自动调整能力

## 技术架构模式

### 1. OODA循环模式 (SRE-Agent)
```
Observe → Orient → Decide → Act → (循环)
```
- 观察: 获取实时状态
- 定向: 解析症状，关联上下文
- 决策: 选择最小安全操作
- 行动: 执行修复并记录结果

### 2. 运行时自省模式 (Neo.mjs)
- 持久化对象模型: 组件是持久对象，不是临时DOM
- Neural Link: AI可查询和修改运行时内存
- 热修补: 无需重载即可修改代码

### 3. 工具链集成模式
- K8s API: 集群状态检查和操作
- GitLab: 代码变更关联
- Jira: 事件管理
- Web: 文档和问题搜索

### 4. 安全边界模式 (ARF)
- OSS版本: 分析和建议
- Enterprise版本: 执行和控制
- 分离决策智能与治理执行

### 5. 测试驱动修复模式 (self-healing-agent)
- 任务递归分解
- 自动生成验证测试
- 循环执行直到测试通过
- 确保修复有效

### 6. 本体自适应模式 (ontology-mcp-self-healing)
- OWL本体表示领域知识
- 模式变化自动检测
- 基于推理的自动调整
- 适合数据库和应用架构变化

## 对OpenClaw的启示

### 已有的自愈能力
- `panic-recovery`: 恐慌恢复
- `self-healer`: 错误修复
- `resilient-connections`: 连接恢复

### 可借鉴的改进
1. **OODA循环**: 为核心代理增加观察-定向-决策-行动循环
2. **运行时自省**: 集成Neural Link类似机制，AI可直接查询状态
3. **K8s集成**: 增加集群状态检查和自愈能力
4. **安全边界**: 区分分析和建议 vs 自动执行
5. **测试驱动修复**: 增加任务验证测试生成，确保修复有效
6. **本体自适应**: 使用本体表示工具/技能能力，变化时自动调整

### 潜在的新技能
- `ooda-loop`: 观察-定向-决策-行动循环执行
- `runtime-introspect`: 运行时状态查询和修改
- `test-driven-heal`: 生成验证测试确保修复有效

## 参考
- https://github.com/neomjs/neo
- https://github.com/qicesun/SRE-Agent-App
- https://github.com/E-Conners-Lab/NetworkOps_Platform
- https://github.com/aqstack/sentinel
- https://github.com/MarketSquare/robotframework-selfhealing-agents
- https://github.com/petterjuan/agentic-reliability-framework
