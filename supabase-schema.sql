-- IELTS Vocabulary 数据库表结构

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 学习进度表
CREATE TABLE IF NOT EXISTS progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic_id TEXT NOT NULL,
  word TEXT NOT NULL,
  mastered BOOLEAN DEFAULT false,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  last_reviewed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id, word)
);

-- 3. 每日计划设置表
CREATE TABLE IF NOT EXISTS daily_plan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_count INT DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 开启 RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入和读取（用户绑定通过 user_id）
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "progress_insert" ON progress;
CREATE POLICY "progress_insert" ON progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "progress_select" ON progress;
CREATE POLICY "progress_select" ON progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "progress_update" ON progress;
CREATE POLICY "progress_update" ON progress FOR UPDATE USING (true);

DROP POLICY IF EXISTS "daily_plan_insert" ON daily_plan;
CREATE POLICY "daily_plan_insert" ON daily_plan FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "daily_plan_select" ON daily_plan;
CREATE POLICY "daily_plan_select" ON daily_plan FOR SELECT USING (true);

DROP POLICY IF EXISTS "daily_plan_update" ON daily_plan;
CREATE POLICY "daily_plan_update" ON daily_plan FOR UPDATE USING (true);
