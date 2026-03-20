-- 죽기스 (죽음의 기상스터디) - Supabase 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
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

-- 3. 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_time ON checkins(checkin_time);

-- 4. Row Level Security 설정 (공개 접근 허용)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);

-- 5. Storage 버킷 설정
-- Supabase Dashboard > Storage > New Bucket 에서 수동 생성:
--   이름: checkin-images
--   Public: true (공개)
--
-- 버킷 생성 후 아래 정책을 Storage > Policies 에서 추가:
--   Policy name: Allow public uploads
--   Allowed operation: INSERT
--   Policy: true
--
--   Policy name: Allow public reads
--   Allowed operation: SELECT
--   Policy: true
