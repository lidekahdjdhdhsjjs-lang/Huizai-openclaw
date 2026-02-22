#!/bin/bash
# VSCodium MiniMax 一键配置脚本

echo "正在配置 VSCodium + MiniMax..."

# 1. 安装 Continue 扩展
echo "[1/3] 安装 Continue AI 编程扩展..."
codium --install-extension Continue.continue --force 2>/dev/null

# 2. 创建配置文件
echo "[2/3] 创建配置文件..."
cat > ~/.config/VSCodium/User/settings.json << 'EOF'
{
  "http.proxySupport": "on",
  "http.proxy": "http://127.0.0.1:7897",
  "https.proxySupport": "on",
  "https.proxy": "http://127.0.0.1:7897",
  "continue.enableContinueAnywhere": true,
  "terminal.integrated.fontSize": 14,
  "files.autoSave": "afterDelay"
}
EOF

# 3. 创建 Continue 配置文件
echo "[3/3] 创建 Continue 配置..."
mkdir -p ~/.continue
cat > ~/.continue/config.json << 'EOF'
{
  "models": [
    {
      "model": "MiniMax-M2.5",
      "apiKey": "MINIMAX_API_KEY",
      "provider": "openai",
      "baseUrl": "https://api.minimax.chat/v1"
    }
  ]
}
EOF

echo ""
echo "✅ 配置完成！"
echo ""
echo "请执行以下步骤完成设置:"
echo "1. 打开 VSCodium: codium"
echo "2. 在扩展市场搜索 'Continue' 并安装"
echo "3. 点击左侧边栏的 Continue 图标"
echo "4. 点击右上角设置，添加 MiniMax:"
echo "   - Model: MiniMax-M2.5"
echo "   - API Key: 你的密钥"
echo "   - Base URL: https://api.minimax.chat/v1"
echo ""
