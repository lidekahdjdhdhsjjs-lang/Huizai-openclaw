### VSCodium MiniMax 配置指南

1. 打开 VSCodium (codium)
2. 安装扩展:
   - **Cline** (推荐) - 搜索 "Cline" 安装
   - 或 **Continue** - 搜索 "Continue" 安装

3. 配置 MiniMax API:
   - 打开设置 (Ctrl+,)
   - 搜索 "Cline" 或 "Continue" 设置
   - 添加自定义模型:
   
**Cline 配置示例:**
```json
{
  "cline.model": "minimax-portal/MiniMax-M2.5",
  "cline.apiKey": "你的MiniMax API Key",
  "cline.baseUrl": "https://api.minimax.chat/v1"
}
```

**或使用 OpenAI 兼容模式:**
```json
{
  "openapi.model": "MiniMax-M2.5",
  "openapi.apiKey": "你的API Key",
  "openapi.baseUrl": "https://api.minimax.chat/v1"
}
```

需要我帮你打开 VSCodium 吗？
