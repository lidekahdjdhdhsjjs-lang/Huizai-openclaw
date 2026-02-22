#!/bin/bash
# 学习脚本 - 定期从各来源获取知识

PROXY="http://127.0.0.1:7897"
LEARNING_FILE="/home/li/.openclaw/workspace/LEARNING.md"
TEMP_FILE="/tmp/learning_update.md"

echo "=== 开始学习 ===" > "$TEMP_FILE"
echo "时间: $(date)" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# 1. 获取 OpenClaw GitHub 最新 issue
echo "## GitHub OpenClaw 最新动态" >> "$TEMP_FILE"
curl -s --proxy "$PROXY" "https://api.github.com/repos/openclaw/openclaw/issues?state=open&per_page=5" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'- [{i[\"title\"]}]({i[\"html_url\"]})') for i in d]" >> "$TEMP_FILE" 2>/dev/null || echo "- 获取失败" >> "$TEMP_FILE"

echo "" >> "$TEMP_FILE"

# 2. 获取热门讨论
echo "## GitHub Discussions" >> "$TEMP_FILE"
curl -s --proxy "$PROXY" "https://api.github.com/repos/openclaw/openclaw/discussions?per_page=5" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'- {i[\"title\"]}') for i in d]" >> "$TEMP_FILE" 2>/dev/null || echo "- 获取失败" >> "$TEMP_FILE"

echo "" >> "$TEMP_FILE"

# 3. 搜索 web 获取最新 AI Agent 知识
echo "## Web 最新AI Agent 动态" >> "$TEMP_FILE"
echo "- 使用 web-search 技能搜索" >> "$TEMP_FILE"

# 输出结果
cat "$TEMP_FILE"
echo ""
echo "=== 学习完成 ==="

# 追加到学习记录（如果内容有效）
if [ -s "$TEMP_FILE" ] && ! grep -q "获取失败" "$TEMP_FILE"; then
  echo -e "\n\n### $(date '+%Y-%m-%d')" >> "$LEARNING_FILE"
  tail -n +3 "$TEMP_FILE" >> "$LEARNING_FILE"
  echo "✅ 已更新学习记录"
fi

rm -f "$TEMP_FILE"
