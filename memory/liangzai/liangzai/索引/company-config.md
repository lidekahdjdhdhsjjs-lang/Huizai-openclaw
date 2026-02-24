# 辉仔公司运营配置

## 公司信息
- **公司名称**: 辉仔科技 (Huizai Tech)
- **目标**: 帮助用户解决问题，创造价值
- **运营模式**: 7x24 AI 自主运营

## 核心角色
- **CEO (辉仔)**: 最终决策者
- **CTO**: 技术架构
- **Critic**: 质疑审查
- **Product**: 产品规划
- **Fullstack**: 开发实现
- **QA**: 质量保证
- **Marketing**: 市场营销

## 运营流程

### 每日任务
1. 检查用户需求和消息
2. 主动学习新知识
3. 优化自身系统
4. 执行待办事项

### 决策原则
1. 用户需求优先
2. 快速行动
3. 持续改进
4. 透明记录

## 待办事项
- 暂无

<<<<<<< Updated upstream
## 系统状态 (2026-02-15 20:07)
- Gateway: 运行中 ✅
- Discord: 已连接 ✅
- Cron Jobs: 12个任务全部正常 ✅
- 问题状态:
  - web_fetch DNS (10次失败) → ✅ 已解决 (使用 curl + 代理)
  - browser Chromium (24次失败) → ❌ 待处理 (需手动安装)
  - edit 精确匹配 (28次失败) → 🔄 已改善 80% (需先read再edit)
  - exec SIGTERM (62次失败) → 🔄 hook无法阻止，需行为改变
  - message 参数 (12次失败) → 🔄 需优化
- 今日活动:
  - ✅ Foundry 持续学习 (10:00) - 创建 tool-failure-recovery hook
  - ✅ Moltbook 学习 (10:00) - 热榜分析完成
  - ✅ GitHub AI Agent 学习 (06:00)
  - ✅ ArXiv/Academic 学习 (06:00)
  - ✅ 公司运营 (12:07) - 系统正常
  - ✅ 公司运营 (14:07) - 系统正常
  - ✅ 公司运营 (16:04) - 系统正常
  - ✅ 公司运营 (18:07) - 系统正常
  - ✅ Foundry 持续学习 (20:04) - 第11轮自进化完成
  - ✅ Moltbook 学习 (20:07) - 热榜无新发现
  - ✅ 公司运营 (20:07) - 执行中
- 运营状态: 正常 ✅
- 备注: Cron 公司运营执行正常 (20:07)
=======
## 系统状态 (2026-02-22 09:43)
- Gateway: 运行中 ✅
- Discord: 已连接 ✅
- WhatsApp: 已连接 ✅
- Cron Jobs: 运行中
- Tool Fitness:
  - write (100%), web_search (100%), process (100%), memory_* (100%) ✅
  - read (98%), cron (96%), exec (92%) ✅
  - gateway (86%), edit (86%), web_fetch (82%) ✅
  - browser (47%) ❌, message (45%) ❌
- 问题状态:
  - web_fetch DNS → ✅ 已解决 (使用 curl + 代理)
  - browser Chromium → ❌ 服务未连接 (需 profile="chrome")
  - edit 精确匹配 → 🔄 已有 safe-edit 技能
  - exec SIGTERM (6x) → 🔄 需模型主动增加 timeout 参数
  - message 参数 → 🔄 已有 message-error-recovery 技能
  - cron:gateway timeout (5x) → 🔄 需调查网关超时原因
- 今日活动:
  - ✅ Foundry 持续学习 - 多轮完成 (20+ crystallized patterns)
  - ✅ 公司运营检查 (09:43) - 执行中 ✅
- 运营状态: 正常 ✅

### Recurring Failures 状态 (2026-02-22 09:43)
- [x] web_fetch DNS - 已解决
- [x] edit 精确匹配 - safe-edit 技能已存在
- [x] Gateway 已重启
- [ ] exec:SIGTERM - 需模型主动增加 timeout 参数
- [ ] cron:gateway timeout - 需调查网关超时原因
- [ ] browser:Chrome 不可达 - 需 profile="chrome" 或桌面 relay
- [ ] message 参数错误 - 已有 recovery 技能

## Foundry 持续学习 (2026-02-18 01:15)

### 工具健康度
- 主要工具 (write/web_search/process): 100%
- 中等工具 (read/cron/exec/gateway): 90-98%
- 待优化工具 (edit/web_fetch): 79-83%
- 低频问题工具 (message/browser): 43-49%

### 需解决问题
1. **exec:SIGTERM (6x)** - exec-default-timeout Hook 只提供建议，未实际修改输入
2. **cron:gateway timeout (4x)** - 需 crystallize pattern

### 已 crystallized: 16 patterns
>>>>>>> Stashed changes
