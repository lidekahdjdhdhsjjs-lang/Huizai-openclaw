# Voxyz 模式接入规划

## 核心架构（6 Agents + Supabase）

| Agent | 职责 | 对应我们的组件 |
|-------|------|---------------|
| 1. CEO Agent | 战略决策、目标设定 | 三人讨论-总结者 |
| 2. Planner Agent | 任务规划分解 | proactive-tasks |
| 3. Executor Agent | 执行具体操作 | exec/工具调用 |
| 4. Monitor Agent | 监控运行状态 | proactive-check |
| 5. Learner Agent | 从结果学习改进 | Foundry/Evolution |
| 6. Reporter Agent | 报告和沟通 | message/通知 |

## Supabase 数据库设计

```sql
-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  status TEXT, -- pending, running, completed, failed
  result JSONB,
  created_at TIMESTAMP
);

-- Agent 状态
CREATE TABLE agent_states (
  agent_id TEXT,
  memory JSONB,
  last_update TIMESTAMP
);
```

## 接入步骤

### Phase 1: 扩展现有Agent（当前可做）
- 三人讨论 → 六人讨论
- 加入Monitor/Learner角色

### Phase 2: 数据库驱动记忆（需要Supabase）
- 将memory迁移到Supabase
- 多设备共享状态

### Phase 3: 自主运营
- 自动任务分配
- 结果自我评估
- 持续改进循环
