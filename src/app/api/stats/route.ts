import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id 필요" }, { status: 400 });

  // 전체 체크인 (시간 포함)
  const { data: checkins } = await supabase
    .from("checkins")
    .select("status, penalty, checkin_time")
    .eq("user_id", userId)
    .order("checkin_time", { ascending: true });

  // 면제권 사용 횟수
  const { count: exemptionUsed } = await supabase
    .from("exemptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("used_for_date", "is", null);

  // 오늘 뭉치 상호작용 수 (전체)
  const { count: sealCount } = await supabase
    .from("seal_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const all = checkins || [];
  const onTime = all.filter((c) => c.status === "on_time");
  const late = all.filter((c) => c.status === "late");
  const totalPenalty = all.reduce((s, c) => s + (c.penalty || 0), 0);

  // 평균 기상 시간 (KST, 정시 출석만)
  let avgCheckinMinutes: number | null = null;
  if (onTime.length > 0) {
    const sum = onTime.reduce((s, c) => {
      const d = new Date(c.checkin_time);
      return s + ((d.getUTCHours() + 9) % 24) * 60 + d.getUTCMinutes();
    }, 0);
    avgCheckinMinutes = Math.round(sum / onTime.length);
  }

  // 출석률 (가입 후 평일 기준 대략 계산)
  const firstDate = all.length > 0 ? new Date(all[0].checkin_time) : new Date();
  const now = new Date();
  const daysSince = Math.max(1, Math.round((now.getTime() - firstDate.getTime()) / 86400000));
  const attendanceRate = Math.min(100, Math.round(((onTime.length + (exemptionUsed || 0)) / daysSince) * 100));

  // 최고 연속 출석일 계산
  let maxStreak = 0;
  let currentStreak = 0;
  const checkinDays = new Set(
    onTime.map((c) => {
      const d = new Date(c.checkin_time);
      // KST 날짜
      const kst = new Date(d.getTime() + 9 * 3600 * 1000);
      return kst.toISOString().split("T")[0];
    })
  );
  const sortedDays = Array.from(checkinDays).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      currentStreak = diff === 1 ? currentStreak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  // 뱃지 계산
  const badges: { id: string; emoji: string; name: string; desc: string }[] = [];

  if (onTime.filter((c) => {
    const d = new Date(c.checkin_time);
    return ((d.getUTCHours() + 9) % 24) < 7;
  }).length >= 3) {
    badges.push({ id: "dawn", emoji: "🌅", name: "새벽기상러", desc: "7시 이전 기상 3회 달성" });
  }

  if (maxStreak >= 5) {
    badges.push({ id: "streak", emoji: "🔥", name: "연속출석러", desc: `${maxStreak}일 연속 정시 출석` });
  }

  if (totalPenalty === 0 && all.length >= 5) {
    badges.push({ id: "perfect", emoji: "💸", name: "벌금 0원 클럽", desc: "단 한 번도 지각하지 않음" });
  }

  if ((sealCount || 0) >= 30) {
    badges.push({ id: "seal_master", emoji: "🦭", name: "물개 사육사", desc: `뭉치와 ${sealCount}번 놀아줌` });
  }

  if (totalPenalty >= 10000) {
    badges.push({ id: "donor", emoji: "😇", name: "죽기스 기부천사", desc: `${totalPenalty.toLocaleString()}원 기부 중` });
  }

  if (onTime.length >= 30) {
    badges.push({ id: "legend", emoji: "👑", name: "기상 레전드", desc: "정시 출석 30회 달성" });
  }

  return NextResponse.json({
    totalOnTime: onTime.length,
    totalLate: late.length,
    totalPenalty,
    avgCheckinMinutes,
    attendanceRate,
    maxStreak,
    exemptionUsed: exemptionUsed || 0,
    sealInteractions: sealCount || 0,
    badges,
  });
}
