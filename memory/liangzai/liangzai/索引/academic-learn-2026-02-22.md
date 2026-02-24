# Academic Learning - 2026-02-22

## 1. ArXiv CS.AI 论文 (2026-02-20)

### 精选论文

**KLong: Training LLM Agent for Extremely Long-horizon Tasks**
- arXiv: 2602.17547
- 作者: Yue Liu 等
- 领域: Artificial Intelligence (cs.AI), Computation and Language (cs.CL)
- 摘要: KLong是一个开源LLM智能体，专为解决极长时域任务而设计。核心方法包括：
  - **Trajectory-splitting SFT**: 先通过轨迹分割的监督微调冷启动模型
  - **Progressive RL**: 渐进式强化学习，分多个阶段逐步延长超时时间
  - **Research-Factory**: 自动 pipeline，从研究论文构建评估标准和长时域轨迹
- **关键技术点**: 
  - 轨迹分割 SFT 保留早期上下文，逐步截断后期上下文
  - 渐进式 RL 调度训练到多个阶段，逐步延长超时
  - 从 Claude 4.5 Sonnet (Thinking) 提取数千条长时域轨迹
- **性能**: KLong (106B) 在 PaperBench 上超越 Kimi K2 Thinking (1T) 达 11.28%
- 链接: https://arxiv.org/abs/2602.17547

**其他近期论文 (arXiv IDs):**
- 2602.17663 ~ 2602.16942 (共169篇)
- 2602.17665: OpenEarthAgent - 地理空间AI智能体框架 (已记录在 learn-2026-02-22.md)

## 2. 关键技术趋势总结

### Long-Horizon LLM Agent 的核心研究方向:
1. **轨迹分割训练**: 将长轨迹分割为子轨迹，保持上下文重叠
2. **渐进式强化学习**: 分阶段训练，逐步延长任务超时时间
3. **自动化数据生成**: Research-Factory 自动构建训练数据和评估标准
4. **长上下文处理**: 保留早期上下文，逐步截断后期上下文
5. **长时域任务评估**: PaperBench, SWE-bench Verified, MLE-bench

### 相关技术栈:
- Claude 4.5 Sonnet (Thinking) 作为教师模型
- 轨迹克隆 (Trajectory Cloning)
- 渐进式课程学习 (Progressive Curriculum Learning)
- SFT + RL 混合训练

## 3. 待深入研究方向
- KLong 与其他长时域智能体的对比研究
- 轨迹分割的最优策略
- 渐进式 RL 的超时调度算法

---
*记录时间: 2026-02-22 09:45*
