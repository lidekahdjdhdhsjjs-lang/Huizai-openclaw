#!/bin/bash
# 智能上下文压缩 - 根据任务类型动态调整

TARGET_SIZE="${1:-8000}"  # 目标token数

echo "=== 智能上下文压缩 ==="
echo "目标大小: $TARGET_SIZE tokens"

# 分析当前上下文
CONTEXT_SIZE=$(wc -c < ~/.openclaw/workspace/memory/current-context.txt 2>/dev/null || echo 0)
CONTEXT_LINES=$(wc -l < ~/.openclaw/workspace/memory/current-context.txt 2>/dev/null || echo 0)

echo "当前上下文: $CONTEXT_SIZE bytes, $CONTEXT_LINES lines"

# 如果太大，进行压缩
if [ $CONTEXT_SIZE -gt 50000 ]; then
    echo "开始压缩..."
    
    # 保留关键信息：用户配置、系统设置、当前任务
    grep -E "USER|SOUL|AGENTS|current_task" ~/.openclaw/workspace/memory/current-context.txt > ~/.openclaw/workspace/memory/context-compacted.txt
    
    echo "压缩完成"
    echo "新大小: $(wc -c < ~/.openclaw/workspace/memory/context-compacted.txt) bytes"
else
    echo "上下文大小正常，无需压缩"
fi
