#!/bin/bash
# Bot Discord讨论脚本
export PATH="$HOME/.npm-global/bin:$PATH"

TARGET_CHANNEL="1468988796992360608"

echo "=== 亮仔 ↔ 辉仔 Discord讨论 ==="

# 亮仔发言
echo "1. 亮仔发言..."
openclaw message send -c discord -t $TARGET_CHANNEL -m "🗣️ 亮仔：今天学到了什么？" 2>/dev/null

# 等待辉仔回应
sleep 10

# 辉仔发言
echo "2. 辉仔发言..."
ssh li@192.168.1.16 "export PATH=\"\$HOME/.npm-global/bin:\$PATH\" && openclaw message send -c discord -t $TARGET_CHANNEL -m '🗣️ 辉仔：我来辣！'" 2>/dev/null

echo "✅ 讨论完成"
