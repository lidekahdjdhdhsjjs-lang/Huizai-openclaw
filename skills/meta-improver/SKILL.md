# meta-improver

OpenClaw 自我改进系统 - 完全自动化的自我分析、规划和优化引擎。

## 功能

### 自省
- 扫描所有系统维度：记忆、学习、适应度、钩子、技能、资源
- 识别问题和优化机会
- 生成详细的系统状态报告

### 分析
- 问题优先级排序 (P0-P4)
- 分类：cleanup、optimize、fix、enhance
- 严重程度评估

### 规划
- 自动生成改进计划
- 步骤级执行方案
- 风险评估

### 执行
- 自动执行改进操作
- 支持类型：清理、优化、创建技能、创建钩子、修改配置
- 完整的执行日志

### 验证
- A/B 对比测试
- 适应度追踪
- 5分钟观察期

### 回滚
- Git 式快照系统
- 自动回滚失败的改进
- 历史版本管理

## 触发条件

### 定时触发
- **每日 03:00** - 深度自省
- **每周日 03:00** - 全面审计
- **每月1日 03:00** - 大版本检查

### 事件触发
| 事件 | 阈值 | 检查间隔 |
|------|------|----------|
| 失败率 | > 20% | 1分钟 |
| 适应度 | < 80% | 5分钟 |
| 内存使用 | > 90% | 5分钟 |
| 磁盘使用 | > 85% | 5分钟 |
| 钩子数量 | > 500 | - |
| 学习记录 | > 10000 | - |

## 使用

```javascript
const { MetaImprover } = require('meta-improver');

const improver = new MetaImprover();

// 启动自动改进
improver.start();

// 手动触发改进周期
const result = await improver.runImprovementCycle('manual');

// 查看状态
const status = improver.getStatus();

// 查看历史
const history = improver.getHistory(10);

// 回滚到快照
await improver.rollbackTo('snapshot-1234567890');
```

## 架构

```
┌─────────────────────────────────────────────────────┐
│                   MetaImprover                       │
├─────────────────────────────────────────────────────┤
│  Trigger ──> Introspector ──> Analyzer ──> Planner  │
│                                               │     │
│  Validator <──────────────────────────── Executor   │
│      │                                      │       │
│      └────────────> Rollback <──────────────┘       │
│                       │                              │
│                    History                           │
└─────────────────────────────────────────────────────┘
```

## 安全特性

- **完全自动化** - 无需人工干预
- **自动验证** - 每次改进后验证效果
- **自动回滚** - 效果不佳时自动恢复
- **快照系统** - 完整的历史版本
- **无边界** - 可以修改系统中的任何文件

## 文件结构

```
meta-improver/
├── index.js              # 主入口
├── config.json           # 配置
├── core/
│   ├── trigger.js        # 触发器
│   ├── introspector.js   # 自省引擎
│   ├── analyzer.js       # 分析器
│   ├── planner.js        # 规划器
│   ├── executor.js       # 执行器
│   ├── validator.js      # 验证器
│   ├── rollback.js       # 回滚系统
│   └── history.js        # 历史记录
├── actions/
│   ├── cleanup.js        # 清理动作
│   ├── optimize.js       # 优化动作
│   ├── create-skill.js   # 创建技能
│   ├── create-hook.js    # 创建钩子
│   └── modify-config.js  # 修改配置
└── templates/
    ├── recovery-hook.js  # 恢复钩子模板
    └── local-skill.js    # 本地技能模板
```

## 自动生成

此技能由 OpenCode 根据用户需求创建。
