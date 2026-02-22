#!/bin/bash
# HackerNews学习

echo "=== HackerNews学习 ==="
curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | head -20

echo "=== 完成 ==="
