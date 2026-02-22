#!/bin/bash
# 增强版Foundry自进化 - 多源学习

echo "=== 多源学习开始 ==="

# 1. GitHub Trending
echo "📊 GitHub Trending..."
curl -s "https://api.github.com/repos/trending?since=weekly" | head -20

# 2. HackerNews Top
echo "📰 HackerNews..."
curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | head -10

# 3. ClawHub热门
echo "🎯 ClawHub热门..."
curl -s "https://clawhub.com/api/skills?sort=popular&limit=10"

echo "=== 学习完成 ==="
