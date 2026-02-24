# Evolution Log - 2026-02-14

## 问题诊断

### 1. web_fetch DNS 失败 (5x)
- **症状**: getaddrinfo ENOTFOUND github.com
- **原因**: Node.js DNS 解析器与系统不一致
- **证据**: 
  - `nslookup github.com` → SERVFAIL
  - `curl https://github.com` → 成功返回 HTML
- **解决方案**: 使用 exec curl 作为 fallback

### 2. heartbeat-state.json 不存在
- **症状**: ENOENT: no such file or directory
- **解决方案**: 创建文件

### 3. MEMORY.md edit 失败
- **症状**: Could not find exact text
- **原因**: 空白字符或编码问题
- **解决方案**: 使用精确匹配

## 已执行优化

1. ✅ 创建 /home/li/.openclaw/workspace/memory/heartbeat-state.json
2. ✅ 创建 smart-web-fetch 技能（带 fallback）
3. ✅ 验证 curl 可以替代 web_fetch

## 待办

- [ ] 更新现有技能，添加 DNS fallback
- [ ] 为 exec 添加超时处理（SIGTERM 问题）
- [ ] 优化 edit 工具的错误处理
