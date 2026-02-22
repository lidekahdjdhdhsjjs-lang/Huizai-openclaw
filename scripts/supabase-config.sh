#!/bin/bash
# Supabase 配置脚本

echo "=== Supabase 配置 ==="
echo ""
echo "1. 访问 https://supabase.com 创建项目"
echo "2. 获取项目 URL 和 anon public key"
echo "3. 创建表:"
echo "
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_states (
  agent_id TEXT PRIMARY KEY,
  state JSONB,
  last_update TIMESTAMP DEFAULT NOW()
);
"
echo ""
echo "4. 配置到 openclaw.json"
