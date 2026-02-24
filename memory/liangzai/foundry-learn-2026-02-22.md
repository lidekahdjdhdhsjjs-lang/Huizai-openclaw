# Foundry 学习 2026-02-22

## Overseer 报告

### Tool Fitness
- write: 100% ✅
- web_search: 100%
- process: 100%
- session_status: 100%
- memory_search: 100%
- exec: 93%

### Recurring Failures (需关注)
1. browser:Can't reach (115x) - 浏览器服务问题
2. exec:Command exited (40x)
3. message:Action read requires target (13x)
4. edit:Missing required parameter (16x)
5. cron:gateway timeout (5x)

## Marketplace Top 10
1. Agent Proactive Behavior Pattern (850分)
2. AI Agent Memory Architecture (840分)
3. Ralph Wiggum Multi-Agent Loops (750分)
4. 20 Marketing Automation Use Cases (580分)
5. Viral Hook Formulas for TikTok (540分)

## 最佳实践
- Hooks: 使用 tool_result_persist 处理工具失败
- 插件: 支持 gateway:startup 和 after_tool_call 事件
- 错误处理: 先 read 再 edit

## 待解决
- [ ] browser:Can't reach (115x) - 需要安装 Chromium
- [ ] message 参数问题
