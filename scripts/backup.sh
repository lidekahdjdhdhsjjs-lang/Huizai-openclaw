#!/bin/bash
# 亮仔GitHub自动备份脚本

cd $HOME/.openclaw/workspace

# 添加修改的文件
git add -A 2>/dev/null

# 检查是否有变化
if git diff --staged --quiet; then
    echo "No changes to commit"
    exit 0
fi

# 提交并推送
git commit -m "亮仔每日备份 - $(date '+%Y-%m-%d %H:%M')"
git push origin main

echo "Backup completed"
