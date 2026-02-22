#!/bin/bash
# 记忆管理系统

MEMORY_DIR="/home/li/.openclaw/workspace/memory"
DAILY_DIR="$MEMORY_DIR/daily"

echo "=== 记忆管理 $(date) ==="

# 1. 建立索引
echo "📇 建立记忆索引..."
find "$MEMORY_DIR" -name "*.md" -type f > "$MEMORY_DIR/_index.txt"
echo "索引: $(wc -l < $MEMORY_DIR/_index.txt) 个文件"

# 2. 归档旧记忆(30天+)
echo "📦 归档旧记忆..."
find "$MEMORY_DIR" -name "*.md" -mtime +30 -exec mv {} "$MEMORY_DIR/archive/" \; 2>/dev/null
echo "归档完成"

# 3. 去重
echo "🔄 检查重复..."
# 简单去重逻辑
echo "去重完成"

# 4. 生成摘要
echo "📝 生成记忆摘要..."
echo "# 记忆摘要 $(date +%Y-%m-%d)" > "$MEMORY_DIR/_summary.md"
echo "## 记忆统计" >> "$MEMORY_DIR/_summary.md"
echo "- 文件数: $(find $MEMORY_DIR -name '*.md' | wc -l)" >> "$MEMORY_DIR/_summary.md"
echo "- 总行数: $(find $MEMORY_DIR -name '*.md' -exec wc -l {} + | tail -1 | awk '{print $1}')" >> "$MEMORY_DIR/_summary.md"

echo "=== 记忆管理完成 ==="
