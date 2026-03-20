-- 죽기스 (죽음의 기상스터디) - Supabase 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  batch TEXT DEFAULT '',
  purpose TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. checkins 테이블 생성
CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  checkin_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('on_time', 'late')),
  penalty INTEGER NOT NULL DEFAULT 0
);

-- 3. exemptions (면제권) 테이블 생성
CREATE TABLE IF NOT EXISTS exemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT DEFAULT '',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_for_date DATE
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_time ON checkins(checkin_time);
CREATE INDEX IF NOT EXISTS idx_exemptions_user_id ON exemptions(user_id);

-- 5. Row Level Security 설정 (공개 접근 허용)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exemptions" ON exemptions FOR ALL USING (true) WITH CHECK (true);
