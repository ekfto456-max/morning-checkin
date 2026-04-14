import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";

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

  // 피드 게시글 수
  const { count: postCount } = await supabase
    .from("posts")
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

  // 현재 활성 연속 출석 (오늘 또는 어제 기준, 끊기면 0)
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const todayKST = nowKST.toISOString().split("T")[0];
  const yesterdayKST = new Date(nowKST.getTime() - 86400000).toISOString().split("T")[0];
  const lastCheckinDay = sortedDays[sortedDays.length - 1] ?? "";
  const activeStreak = (lastCheckinDay === todayKST || lastCheckinDay === yesterdayKST) ? currentStreak : 0;

  // 뱃지 계산
  const badges: { id: string; emoji: string; name: string; desc: string }[] = [];

  // 새벽기상러
  if (onTime.filter((c) => {
    const d = new Date(c.checkin_time);
    return ((d.getUTCHours() + 9) % 24) < 7;
  }).length >= 3) {
    badges.push({ id: "dawn", emoji: "🌅", name: "새벽기상러", desc: "7시 이전 기상 3회 달성" });
  }

  // 연속출석러 (현재 유지 중인 스트릭만, 끊기면 철회)
  if (activeStreak >= 5) {
    badges.push({ id: "streak", emoji: "🔥", name: "연속출석러", desc: `${activeStreak}일 연속 정시 출석 중` });
  }

  // 벌금 0원 클럽
  if (totalPenalty === 0 && all.length >= 5) {
    badges.push({ id: "perfect", emoji: "💸", name: "벌금 0원 클럽", desc: "단 한 번도 지각하지 않음" });
  }

  // 물개 뱃지 (티어별, 여러 개 해당 시 랜덤 1개)
  const seal = sealCount || 0;
  const sealTiers: { id: string; emoji: string; name: string; desc: string }[] = [];
  if (seal >= 400) sealTiers.push({ id: "seal_owner",  emoji: "🦭", name: "물개 주인",      desc: `뭉치와 ${seal}번 교감` });
  if (seal >= 300) sealTiers.push({ id: "seal_born",   emoji: "🦭", name: "물개 낳은 사람", desc: `뭉치와 ${seal}번 교감` });
  if (seal >= 200) sealTiers.push({ id: "seal_mom",    emoji: "🦭", name: "물개 엄마",      desc: `뭉치와 ${seal}번 교감` });
  if (seal >= 100) sealTiers.push({ id: "seal_master", emoji: "🦭", name: "물개 사육사",    desc: `뭉치와 ${seal}번 교감` });
  if (sealTiers.length > 0) {
    badges.push(sealTiers[Math.floor(Math.random() * sealTiers.length)]);
  }

  // 기부천사
  if (totalPenalty >= 30000) {
    badges.push({ id: "donor", emoji: "😇", name: "죽기스 기부천사", desc: `${totalPenalty.toLocaleString()}원 기부 중` });
  }

  // 기상 레전드
  if (onTime.length >= 20) {
    badges.push({ id: "legend", emoji: "👑", name: "기상 레전드", desc: "정시 출석 20회 달성" });
  }

  // 수다쟁이
  if ((postCount || 0) >= 5) {
    badges.push({ id: "chatter", emoji: "💬", name: "수다쟁이", desc: `피드 글 ${postCount}개 작성` });
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
