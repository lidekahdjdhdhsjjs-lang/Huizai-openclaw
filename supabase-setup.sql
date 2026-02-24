-- Supabase 数据库设置
-- 在 Supabase SQL Editor 中运行

-- 1. 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  data JSONB,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建 Agent 状态表
CREATE TABLE IF NOT EXISTS agent_states (
  agent_id TEXT PRIMARY KEY,
  state JSONB,
  last_update TIMESTAMP DEFAULT NOW()
);

-- 3. 创建记忆表
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE,
  value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 启用 RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- 5. 允许匿名访问
CREATE POLICY "Allow anonymous read" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous read" ON agent_states FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON agent_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON agent_states FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous read" ON memories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON memories FOR UPDATE USING (true);

-- 6. 创建索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at);
