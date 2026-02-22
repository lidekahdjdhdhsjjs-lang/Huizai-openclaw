#!/bin/bash
# Foundry 持续学习脚本 - 从 GitHub、Moltbook 学习

PROXY="http://127.0.0.1:7897"
DATE=$(date +%Y-%m-%d)
LEARN_FILE="/home/li/.openclaw/workspace/memory/foundry-learn-$DATE.md"

echo "# Foundry 持续学习 - $DATE" > "$LEARN_FILE"
echo "" >> "$LEARN_FILE"

# 1. GitHub OpenClaw Issues
echo "## GitHub OpenClaw 最新 Issues" >> "$LEARN_FILE"
curl -s --proxy "$PROXY" "https://api.github.com/repos/openclaw/openclaw/issues?state=open&per_page=5" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'- [{i[\"title\"]}]({i[\"html_url\"]})') for i in d]" >> "$LEARN_FILE" 2>/dev/null || echo "- 获取失败" >> "$LEARN_FILE"

echo "" >> "$LEARN_FILE"

# 2. GitHub Trending (AI/Agent)
echo "## GitHub Trending AI/Agent" >> "$LEARN_FILE"
curl -s --proxy "$PROXY" "https://api.github.com/search/repositories?q=ai+agent+openai&sort=stars&order=desc&per_page=5" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'- {i[\"full_name\"]} ⭐{i[\"stargazers_count\"]}') for i in d.get('items',[])]" >> "$LEARN_FILE" 2>/dev/null || echo "- 获取失败" >> "$LEARN_FILE"

echo "" >> "$LEARN_FILE"

# 3. Moltbook 热门
echo "## Moltbook 热门" >> "$LEARN_FILE"
echo "- 需要 API key 访问" >> "$LEARN_FILE"

echo "" >> "$LEARN_FILE"

# 4. arXiv AI 论文
echo "## arXiv 最新 AI 论文" >> "$LEARN_FILE"
curl -s --proxy "$PROXY" "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=5" | \
  python3 -c "import xml.etree.ElementTree as ET, sys; tree=ET.fromstring(sys.stdin.read()); [print(f'- {e.find('{http://www.w3.org/2005/Atom}title').text[:60]}') for e in tree.findall('.//{http://www.w3.org/2005/Atom}entry')]" >> "$LEARN_FILE" 2>/dev/null || echo "- 获取失败" >> "$LEARN_FILE"

echo ""
echo "✅ Foundry 学习完成: $LEARN_FILE"

# 调用 foundry 工具记录学习
echo "Learning from GitHub and arXiv"
