-- reactions, comments 테이블의 checkin_id FK 제약 제거
-- 면제권(exemption) ID도 저장할 수 있도록 허용

ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_checkin_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_checkin_id_fkey;
