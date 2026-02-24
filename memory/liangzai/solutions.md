# 问题解决方案

记录常见问题的解决方法。

## Discord

### Token 失效
- 症状: 401 Unauthorized
- 解决: Discord Developer Portal → Applications → Bot → Reset Token
- 验证: `curl -H "Authorization: Bot TOKEN" https://discord.com/api/v10/users/@me`

### 配置格式错误
- 症状: Invalid config: accounts expected record, received array
- 解决: 数组改对象格式 `{"id": {"token": "xxx"}}`

## OpenClaw

### Gateway Timeout
- 原因: 服务未启动或崩溃
- 解决: `openclaw gateway restart`

### Exec SIGTERM
- 原因: 命令超时
- 解决: 增加 timeout 参数

### Edit 精确匹配失败
- 解决: 先 read 获取精确文本再 edit

## 记忆系统

### 搜索无结果
- 检查: memorySearch 是否启用
- 配置: openclaw.json → agents.defaults.memorySearch

### 语义搜索弱
- 解决: 配置向量嵌入 API

---

更新: 2026-02-23
