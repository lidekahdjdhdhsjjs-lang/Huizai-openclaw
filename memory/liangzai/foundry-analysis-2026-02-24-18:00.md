# Foundry 分析报告 - 2026-02-24 18:00

## 工具健康度

| 工具 | Fitness | 成功 | 失败 |
|------|---------|------|------|
| browser | 49% | 236 | 248 |
| message | 44% | 139 | 178 |
| cron_safe | 40% | 2 | 3 |
| edit | 84% | 909 | 178 |
| web_fetch | 82% | 270 | 58 |
| gateway | 86% | 252 | 41 |
| exec | 94% | 4582 | 298 |
| cron | 96% | 348 | 16 |

## Recurring Failures (Top 5)

1. **browser:Can't reach browser** - 115x (主因: Chrome extension未连接)
2. **edit:Missing required parameter oldText** - 21x
3. **web_fetch:DNS ENOTFOUND github.com** - 11x
4. **edit:Could not find exact text** - 36x (memory/foundry.md 16x, MEMORY.md 7x)
5. **exec:SIGTERM** - 18x (超时/内存问题)

## 解决方案

### Browser (49%)
- 方案A: `profile="openclaw"` 使用独立浏览器
- 方案B: 用户点击 Chrome 扩展图标附着标签页

### Message (44%)
- 所有 Discord 操作需显式指定 `guildId`

### Edit (84%)
- 使用 `memory_search` + `memory_get` 获取精确文本
- 或者用 `exec sed` 替代

### Exec SIGTERM (18x)
- 添加 `timeout` 参数
- 检查长时间运行的命令

### Cron Gateway Timeout (5x)
- 间歇性，已自动恢复
- 建议: health check 改为 127.0.0.1

## Crystallized Hooks

- (待创建)
