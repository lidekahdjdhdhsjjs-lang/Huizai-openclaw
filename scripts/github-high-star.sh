#!/bin/bash
# GitHub高星项目即时学习

echo "=== GitHub高星项目检测 ==="
# 检测GitHub Trending
curl -s "https://api.github.com/search/repositories?q=stars:>1000+created:>2024-01-01&sort=stars&order=desc" | head -50

echo "=== 检测完成 ==="
