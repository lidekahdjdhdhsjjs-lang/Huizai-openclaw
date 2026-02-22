# Error Recovery Skill

自动修复常见的工具失败问题。

## 问题与解决方案

### 1. edit 精确匹配失败
**问题**: "Could not find the exact text"
**解决**: edit 前必须先 read 获取精确文本

```javascript
// 错误示例
edit({ path: "file.md", oldText: "旧内容", newText: "新内容" })

// 正确示例
read({ path: "file.md" }) // 先读取
edit({ path: "file.md", oldText: "精确的旧内容", newText: "新内容" })
```

### 2. edit 无变化
**问题**: "No changes made" - 内容已相同
**解决**: 先 read 确认差异后再 edit

### 3. web_fetch DNS 失败
**问题**: "getaddrinfo ENOTFOUND"
**解决**: 使用 curl + 代理

```bash
curl -s --proxy http://127.0.0.1:7899 "URL"
```

### 4. browser Chrome 不可达
**问题**: CDP 服务不可用
**解决**: 使用 Playwright 直接调用

```bash
npx -y -p playwright node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('URL');
  // 操作...
  await browser.close();
})();
"
```

### 5. message guildId required
**解决**: 使用正确的 channel 参数

### 6. exec SIGTERM
**原因**: 超时或被杀死
**解决**: 增加 timeout 参数，或使用后台执行

## 使用方式

遇到失败时，按照上述解决方案重试。
