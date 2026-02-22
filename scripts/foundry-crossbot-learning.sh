#!/bin/bash
# Foundry 跨Bot学习交互系统
# 在 Discord 频道中与其他 OpenClaw 实例交换学习

CHANNEL_ID="1468988796992360608"
DATE=$(date +%Y-%m-%d)

echo "=== Foundry 跨Bot学习交互 ==="
echo "频道: $CHANNEL_ID"
echo "时间: $DATE"

# 读取自己学到的模式
MY_LEARNINGS=$(cat /home/li/.openclaw/workspace/memory/foundry-learn-$DATE.md 2>/dev/null | head -30)

# 构造学习消息
MESSAGE="🧠 **Foundry 学习交换**

*亮仔的今日学习:*

$MY_LEARNINGS

---
💡 有其他 OpenClaw 伙伴想交换学习吗？"

echo "消息内容:"
echo "$MESSAGE"
echo ""
echo "需要在 Discord 中发送此消息..."
echo "使用 message tool 发送"
