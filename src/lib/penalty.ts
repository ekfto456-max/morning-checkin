/**
 * 죽기스 벌금 계산 (KST 한국 시간 기준)
 *
 * - 10:04 이전 (10:03:59까지) → 정시 (벌금 0원)
 * - 10:04 ~ 10:15 (10:15:59까지) → 지각 (벌금 2,000원)
 * - 10:16 이후 → 지각 (벌금 5,000원)
 */
export function calculatePenalty(checkinTime: Date): {
  status: "on_time" | "late";
  penalty: number;
} {
  // KST = UTC+9. 서버가 미국에 있어도 한국 시간 기준으로 계산
  const KST_OFFSET = 9 * 60; // 분 단위
  const utcMinutes = checkinTime.getUTCHours() * 60 + checkinTime.getUTCMinutes();
  const kstMinutes = (utcMinutes + KST_OFFSET) % (24 * 60);

  // 10:04 = 604분. 603분(10:03)까지는 정시
  const onTimeLimit = 10 * 60 + 3; // 10:03 (before 10:04)
  const lateLimit = 10 * 60 + 15;  // 10:15

  if (kstMinutes <= onTimeLimit) {
    return { status: "on_time", penalty: 0 };
  } else if (kstMinutes <= lateLimit) {
    return { status: "late", penalty: 2000 };
  } else {
    return { status: "late", penalty: 5000 };
  }
}

/**
 * KST 기준 오늘의 시작/끝 (UTC로 변환해서 반환)
 * Supabase 쿼리용
 */
export function getKSTDayRange(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  // KST 날짜 구하기
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstDate = kstNow.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // KST 자정을 UTC로 변환
  const startOfDay = new Date(`${kstDate}T00:00:00+09:00`);
  const endOfDay = new Date(`${kstDate}T23:59:59+09:00`);

  return { startOfDay, endOfDay };
}
