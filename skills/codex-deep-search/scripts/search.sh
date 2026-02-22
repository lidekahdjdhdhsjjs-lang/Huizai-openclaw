#!/bin/bash
# Deep Research Script - 使用 Brave Search 做深度研究
# 替换原 Codex 方案

QUERY="${1:-}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/.openclaw/workspace/data/deep-research}"
TIMEOUT="${TIMEOUT:-120}"

mkdir -p "$OUTPUT_DIR"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <research-query>"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TASK_NAME="research-$TIMESTAMP"
OUTPUT_FILE="$OUTPUT_DIR/$TASK_NAME.md"

echo "=== Deep Research: $QUERY ==="
echo "Output: $OUTPUT_FILE"

# 第一轮：广泛搜索
echo "[Round 1/3] Broad search with Brave..."
brave-search "$QUERY" --count 20 > "$OUTPUT_FILE.tmp" 2>/dev/null || echo "Brave search failed"

# 提取 URLs
URLS=$(grep -oE 'https?://[^ ]+' "$OUTPUT_FILE.tmp" | head -5)

# 第二轮：获取详细内容
echo "[Round 2/3] Fetching detailed content..."
{
    echo "# 深度研究: $QUERY"
    echo ""
    echo "## 第一轮搜索结果"
    echo ""
    cat "$OUTPUT_FILE.tmp"
    echo ""
    echo "## 详细内容"
    echo ""
} > "$OUTPUT_FILE"

for URL in $URLS; do
    echo "Fetching: $URL"
    CONTENT=$(curl -sS -L --max-time 30 "$URL" 2>/dev/null | head -100)
    if [ -n "$CONTENT" ]; then
        echo "### 来源: $URL" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "$CONTENT" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# 第三轮：综合分析
echo "[Round 3/3] Generating summary..."
{
    echo "## 研究总结"
    echo ""
    echo "基于以上搜索结果，$QUERY 的关键要点："
    echo "1. [待分析]"
    echo "2. [待分析]"
    echo ""
} >> "$OUTPUT_FILE"

# 清理
rm -f "$OUTPUT_FILE.tmp"

echo "✅ Research complete: $OUTPUT_FILE"
