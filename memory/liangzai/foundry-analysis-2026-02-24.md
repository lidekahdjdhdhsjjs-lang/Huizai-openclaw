# Foundry 自进化分析报告

**时间**: 2026-02-24 15:20

## 工具健康度

| 工具 | 成功率 | 失败次数 |
|------|--------|----------|
| browser | 49% | 242 |
| message | 44% | 178 |
| edit | 84% | 170 |
| web_fetch | 83% | 56 |
| gateway | 86% | 41 |
| cron | 96% | 16 |

## 主要问题分析

### 1. Browser (115x "Can't reach browser")
- **原因**: profile="chrome" 需要 Chrome extension relay 连接
- **当前状态**: Browser 已启用但 profile 为 "chrome"
- **解决方案**: 
  - 方案A: 改用 profile="openclaw" 使用独立浏览器
  - 方案B: 用户需在 Chrome 上点击 OpenClaw 扩展图标附着标签页
- **配置位置**: openclaw.json > browser

### 2. Message (178x failures)
- **主要错误**: `guildId required` (14x), `Action read requires a target` (15x)
- **原因**: Discord 操作缺少 guildId 上下文
- **解决方案**: 所有 Discord message 调用需显式指定 guildId

### 3. Exec SIGTERM (18x)
- **原因**: 命令被 SIGTERM 信号终止
- **可能原因**: 
  - 命令执行超时
  - 系统内存不足
  - 手动终止
- **建议**: 检查长时间运行的命令

### 4. Cron Gateway Timeout (5x)
- **发生时间**: 05:44-07:20 之间
- **原因**: 可能是网关刚启动或网络问题
- **当前状态**: 已恢复，运行正常

### 5. Edit 失败 (16x memory/foundry.md)
- **原因**: oldText 精确匹配失败（空格/换行符）
- **建议**: 使用 memory_search + memory_get 获取精确文本后再编辑

## 已生成 Insights

Foundry 已为以下问题创建 insights:
- cron:gateway timeout (5x)
- exec:Command aborted by SIGTERM (18x)
- browser:Can't reach browser service (115x)
- edit:Could not find exact text (多次)
- message:guildId required (14x)

## 建议行动

1. **Browser**: 修改配置文件将 browser.profile 改为 "openclaw"
2. **Message**: 创建 hook 自动注入 guildId（如果可用）
3. **Edit**: 添加预检查确认文本存在
4. **Cron Timeout**: 已自动恢复，监控即可
