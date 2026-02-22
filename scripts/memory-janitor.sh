#!/bin/bash
# Memory Janitor - 清理过期记忆
# P1: 90天 | P2: 30天

MEMORY_DIR="$HOME/.openclaw/workspace/memory"
ARCHIVE_DIR="$MEMORY_DIR/archive"
TODAY=$(date +%Y-%m-%d)

echo "[$TODAY] Memory Janitor 开始运行..."

# 创建archive子目录（按月）
ARCHIVE_MONTH="$ARCHIVE_DIR/$(date +%Y-%m)"
mkdir -p "$ARCHIVE_MONTH"

# 统计
moved=0
deleted=0

# 扫描过期P2文件（30天+）
find "$MEMORY_DIR" -name "*.md" -mtime +30 | while read file; do
    filename=$(basename "$file")
    # 跳过核心文件
    if [[ "$filename" == "MEMORY.md" ]] || [[ "$filename" == ".abstract" ]] || [[ "$filename" == "SOUL.md" ]]; then
        continue
    fi
    # 跳过目录
    if [[ -d "$file" ]]; then
        continue
    fi
    mv "$file" "$ARCHIVE_MONTH/" 2>/dev/null
    echo "  [P2] 移动: $filename -> archive/"
    ((moved++))
done

# 清理超过180天的归档
find "$ARCHIVE_DIR" -name "*.md" -mtime +180 -delete 2>/dev/null
deleted=$(find "$ARCHIVE_DIR" -name "*.md" -mtime +180 2>/dev/null | wc -l)

# 更新 .abstract
cat > "$MEMORY_DIR/.abstract" << 'EOF'
# Memory Index (L0)

## Active Topics
- 亮仔身份与性格 (files: MEMORY.md, SOUL.md)
- OpenClaw系统配置 (files: AGENTS.md, TOOLS.md)
- 三人讨论系统 (files: discussion-config.json, discussion-rules.md)
- 自动化任务cron (files: weekly-report-2026-02-22.md)
- Foundry自进化 (files: foundry-evolution-*.md, evolution-*.md)

## Retrieval Hints
- identity, personality, 亮仔
- config, channels, discord, whatsapp
- discussion, triple-robot, 辉仔, 康仔
- cron, automation, backup
- foundry, evolution, patterns, insights

## Recent Updates
- LAST_UPDATE_PLACEHOLDER

## Subdirectories
- daily/ - 每日原始日志 (L2)
- skills/ - 技能学习记录
- projects/ - 项目相关
- archive/ - 已归档 (180天+)

## Lifecycle
- P0: 永久 (身份、偏好、长期原则)
- P1: 90天 (活跃项目)
- P2: 30天 (临时信息)

---
Last updated: LAST_UPDATE_PLACEHOLDER
EOF

sed -i "s/LAST_UPDATE_PLACEHOLDER/$TODAY/g" "$MEMORY_DIR/.abstract"

echo "[$TODAY] 完成: 移动 $moved 个文件，删除 $deleted 个过期文件"
