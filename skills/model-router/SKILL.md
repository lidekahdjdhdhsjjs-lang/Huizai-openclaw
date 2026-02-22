---
name: model-router
description: 模型路由 - 根据任务类型自动选择最优模型
metadata:
  openclaw:
    emoji: 🎯
---

# Model Router 模型路由

## 功能
根据任务类型自动选择最优模型

## 路由规则
| 任务类型 | 推荐模型 |
|----------|----------|
| 编程/代码 | minimax-portal/MiniMax-M2.5 |
| 运营/日常 | minimax-portal/MiniMax-M2.1 |
| 搜索/信息 | minimax-portal/GLM-4.7-Flash |
| 深度思考 | minimax-portal/MiniMax-M2.5 |
| 快速回复 | minimax-portal/GLM-5-S-flash |

## 使用方式
在任务提示中指定模型
