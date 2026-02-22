#!/bin/bash
# 自我进化脚本 - 定期分析并尝试生成新技能
# 整合到 cron，每周日运行

LOG_FILE="$HOME/.openclaw/workspace/memory/self-evolution.log"
SKILLS_DIR="$HOME/.openclaw/workspace/skills"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "=== 开始自我进化 ==="

# 1. 代码优化分析
log "1. 运行代码优化分析..."
bash ~/.openclaw/workspace/scripts/code-optimizer.sh 2>&1 | tee -a "$LOG_FILE"

# 2. 检查是否有新需求（从反馈中提取）
log "2. 分析用户需求..."
python3 << 'PYEOF'
import json
import os
from datetime import datetime, timedelta

feedback_path = os.path.expanduser("~/.openclaw/workspace/memory/feedback-loop.json")
if os.path.exists(feedback_path):
    with open(feedback_path) as f:
        data = json.load(f)
    
    # 提取失败/重复的需求
    needs = []
    for action in data.get("actions", [])[-20:]:
        if action.get("result") == "failed":
            needs.append(action.get("action"))
    
    if needs:
        print(f"发现 {len(needs)} 个待满足需求")
        for n in needs[:3]:
            print(f"  - {n}")
    else:
        print("暂无未满足需求")
else:
    print("无反馈数据")
PYEOF

# 3. 生成新技能建议
log "3. 生成技能建议..."
python3 << 'PYEOF'
import os
import random

# 基于现有技能生成新技能建议
suggestions = [
    ("slack-integration", "Slack 集成技能"),
    ("notion-sync", "Notion 同步技能"),
    ("cron-manager", "定时任务管理器"),
    ("api-monitor", "API 监控技能"),
    ("backup-automation", "自动备份技能"),
    ("health-check", "健康检查技能"),
]

skills_dir = os.path.expanduser("$SKILLS_DIR")
existing = os.listdir(skills_dir)

# 随机推荐一个不存在的技能
for slug, desc in suggestions:
    if slug not in existing:
        print(f"建议生成: {slug} - {desc}")
        break
PYEOF

# 4. 检查并清理无效技能
log "4. 检查无效技能..."
python3 << 'PYEOF'
import os

skills_dir = os.path.expanduser("$SKILLS_DIR")
to_remove = []

for skill in os.listdir(skills_dir):
    path = os.path.join(skills_dir, skill)
    if os.path.isdir(path):
        # 没有 SKILL.md 的技能
        if not os.path.exists(os.path.join(path, "SKILL.md")):
            to_remove.append(skill)

if to_remove:
    print(f"需要清理: {to_remove}")
else:
    print("无需清理")
PYEOF

log "=== 自我进化完成 ==="
