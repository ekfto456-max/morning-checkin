-- 1. users 테이블에 avatar_url 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. 푸시 알림 구독 테이블 생성
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
