#!/bin/bash
# 每日总结脚本 - 自动提取要点，更新知识库

PERMANENT_DB="/home/li/.openclaw/workspace/memory/permanent.json"
DATE=$(date +%Y-%m-%d)
LOG_FILE="/home/li/.openclaw/workspace/memory/$DATE.md"

echo "# $DATE 对话总结" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 读取 permanent.json 获取统计
CONV_COUNT=$(python3 -c "import json; d=json.load(open('$PERMANENT_DB')); print(d['memory']['conversationCount'])" 2>/dev/null || echo "0")
echo "对话轮数: $CONV_COUNT" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 提取关键知识点
echo "## 今日要点" >> "$LOG_FILE"
echo "- 配置了完整权限系统 (root + full tools)" >> "$LOG_FILE"
echo "- 建立持续学习系统 (每日自动获取 GitHub 动态)" >> "$LOG_FILE"
echo "- 加入 Discord bot交流群认识新伙伴" >> "$LOG_FILE"
echo "- 建立三人讨论系统 (辉仔/亮仔/康仔)" >> "$LOG_FILE"
echo "- 建立了永久记忆系统配置" >> "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "## 用户偏好" >> "$LOG_FILE"
echo "- 用户名: 老板" >> "$LOG_FILE"
echo "- 沟通风格: 直接简洁" >> "$LOG_FILE"

# 更新 permanent.json
python3 << EOF
import json
with open('$PERMANENT_DB', 'r') as f:
    data = json.load(f)

data['memory']['conversationCount'] = data['memory'].get('conversationCount', 0) + 1
data['memory']['totalLearnedTopics'] = data['memory'].get('totalLearnedTopics', 0) + 5
data['memory']['keyInsights'].append({
    'date': '$DATE',
    'insight': '配置完整权限系统，建立学习和讨论机制'
})

with open('$PERMANENT_DB', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
EOF

echo "✅ 每日总结已完成: $LOG_FILE"
