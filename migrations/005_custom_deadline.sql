-- 개인 마감 시간 설정 (null = 기본 10:03)
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_deadline_time TEXT;

-- 신중훈: 07:03, 임정혁: 09:03
UPDATE users SET custom_deadline_time = '07:03' WHERE name = '신중훈';
UPDATE users SET custom_deadline_time = '09:03' WHERE name = '임정혁';
