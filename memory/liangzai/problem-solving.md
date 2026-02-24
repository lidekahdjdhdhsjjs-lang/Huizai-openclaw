# 问题解决模式库

## 1. web_fetch DNS 解析失败

### 问题
```
web_fetch:getaddrinfo ENOTFOUND github.com
```
Node.js DNS 解析器不使用 HTTP_PROXY 环境变量，导致域名解析失败。

### 解决方案

#### 方案 A: 使用 curl 代替 (推荐)
```javascript
// smart-fetch.js
const { execSync } = require('child_process');
const result = execSync(`curl -sS -L --proxy http://127.0.0.1:7899 "${url}"`, {
  encoding: 'utf8',
  timeout: 30000
});
```

#### 方案 B: 创建 skill
位置: ~/.openclaw/skills/curl-fetch/SKILL.md

#### 方案 C: 创建 hook
位置: ~/.openclaw/hooks/web-fetch-dns-fallback/

### 验证
```bash
node ~/.local/bin/smart-fetch.js https://github.com
```

---

## 2. OpenClaw Browser 连接失败

### 问题
```
browser: Can't reach the OpenClaw browser control service
```
OpenClaw CDP 服务未启动或 Firefox 配置问题。

### 解决方案

#### 方案 A: 启动 OpenClaw 管理的浏览器 (推荐)
```bash
# 使用 profile: "openclaw" 启动自管理的浏览器
browser action=start profile=openclaw
```

#### 方案 B: 使用 Chrome extension relay
```bash
# 确保 Chrome 扩展已连接标签页
# profile: "chrome" 需要已打开的标签页
```

#### 方案 C: 使用 Playwright 直接控制
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({ 
  headless: false,
  args: ['--disable-blink-features=AutomationControlled']
});
```

#### 方案 B: 创建 skill
位置: ~/.openclaw/skills/playwright-browser/SKILL.md

#### 方案 C: 配置 Firefox
```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/firefox"
  }
}
```

---

## 3. cron_safe 工具不存在

### 问题
```
Tool cron_safe not found
```

### 解决方案
使用 `cron` 工具代替，或检查工具是否已安装。

---

## 4. X 注册页面动态渲染

### 问题
Playwright 找不到 X 注册页面的输入框元素。

### 解决方案
1. 等待更长时间让页面加载
2. 使用 JavaScript 直接操作 DOM
3. 截图调试查看实际渲染情况
4. 考虑手动注册或换时间段重试

---

## 关键教训

1. **DNS 问题**: Node.js 和 curl 使用不同的 DNS 解析机制
2. **浏览器服务**: OpenClaw browser 需要单独的服务，不是内置功能
3. **动态页面**: 社交网站通常使用复杂的前端框架，需要额外等待时间
4. **代理设置**: curl 用 `--proxy`，Node.js 需要设置 `agent`

## 工具推荐

| 场景 | 工具 | 位置 |
|------|------|------|
| 网页抓取 | curl + 代理 | ~/.local/bin/smart-fetch.js |
| 浏览器自动化 | Playwright | npx playwright |
| 备用工具 | foundry_add_tool | 扩展开发 |

## 更新记录

- 2026-02-14: 初始记录
