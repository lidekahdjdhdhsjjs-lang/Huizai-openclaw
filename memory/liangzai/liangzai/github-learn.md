# GitHub AI 学习 - Self-Healing Agent

> Updated: 2026-02-22

## 概述

Self-Healing Agent (自愈代理) 是指能够自动检测、诊断和修复自身故障的AI系统。

## 关键项目分析

### 1. Robot Framework Self-Healing Agents
- **语言**: Python
- **功能**: 使用LLM自动修复失败的Robot Framework测试中的broken locators
- **特点**:
  - 自动修复broken locators
  - 支持Browser & Selenium
  - 支持OpenAI, Azure OpenAI, LiteLLM
  - 生成修复报告和diff
- **链接**: https://github.com/MarketSquare/robotframework-selfhealing-agents

### 2. Agentic Reliability Framework (ARF)
- **语言**: Python
- **功能**: 基础设施可靠性分析和执行智能的平台
- **架构**: 
  - OSS版本: 分析和创建意图 (advisory)
  - Enterprise版本: 安全执行意图
- **核心能力**:
  - 可靠性事件摄取
  - 多阶段分析管道 (检测、诊断、预测)
  - 历史模式召回
  - 确定性安全 guardrails
- **链接**: https://github.com/petterjuan/agentic-reliability-framework

### 3. Cruise Control (LinkedIn)
- **语言**: Java
- **功能**: Kafka集群的自动化动态工作负载重平衡和自愈
- **链接**: https://github.com/linkedin/cruise-control

### 4. Neo - AI-Native Runtime
- **语言**: JavaScript
- **功能**: 多线程AI运行时，具有持久化Scene Graph
- **特点**: 允许AI代理实时内省和修改活的应用结构
- **链接**: https://github.com/neomjs/neo

### 5. Sentinel
- **语言**: Go
- **功能**: 具有预测性故障检测和分区弹性编排的自愈边缘计算代理
- **链接**: https://github.com/aqstack/sentinel

## 技术模式

1. **LLM修复**: 使用AI理解失败原因并生成修复方案
2. **多代理协作**: 分离检测、诊断、修复角色
3. **图计算**: 使用图结构存储和召回历史故障模式
4. **确定性保障**: 配置驱动的安全策略约束AI行为

## 学习资源

- 关键词: "self-healing agent", "autonomous healing", "agentic reliability"
- 相关主题: Kubernetes self-healing, infrastructure as code, AIops

## TODO

- [ ] 深入研究ARF的图计算实现
- [ ] 探索LLM在自愈系统中的应用
- [ ] 了解OpenClaw的自愈能力可能性
