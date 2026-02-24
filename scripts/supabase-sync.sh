#!/bin/bash
# Supabase 同步脚本 - 辉仔↔亮仔状态同步

PROJECT_URL="https://yojutfwepfroxozwxzqv.supabase.co"
ANON_KEY="${SUPABASE_KEY:-YOUR_KEY_HERE}"

echo "=== Supabase 同步 ==="

# 测试连接
curl -sS "$PROJECT_URL/rest/v1/" -H "apikey: $ANON_KEY" | head -5

# 同步任务
echo "1. 同步任务..."
curl -sS -X POST "$PROJECT_URL/rest/v1/tasks" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"test","data":{}}'

echo "✅ 连接测试完成"
