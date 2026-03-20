/**
 * 죽기스 벌금 계산
 *
 * - 10:04 이전 (10:03:59까지) → 정시 (벌금 0원)
 * - 10:04 ~ 10:15 (10:15:59까지) → 지각 (벌금 2,000원)
 * - 10:16 이후 → 지각 (벌금 5,000원)
 */
export function calculatePenalty(checkinTime: Date): {
  status: "on_time" | "late";
  penalty: number;
} {
  const hours = checkinTime.getHours();
  const minutes = checkinTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 10:04 = 604분. 603분(10:03)까지는 정시
  const onTimeLimit = 10 * 60 + 3; // 10:03 (before 10:04)
  const lateLimit = 10 * 60 + 15; // 10:15

  if (totalMinutes <= onTimeLimit) {
    return { status: "on_time", penalty: 0 };
  } else if (totalMinutes <= lateLimit) {
    return { status: "late", penalty: 2000 };
  } else {
    return { status: "late", penalty: 5000 };
  }
}
