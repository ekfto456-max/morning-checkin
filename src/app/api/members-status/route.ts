import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockUsers, mockCheckins, mockExemptions } from "@/lib/mock-store";

export async function GET() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  if (isUsingMockMode()) {
    // Mock: 이번 주 면제권 전체 자동 지급
    const nowM = new Date();
    const dowM = nowM.getDay();
    const offM = dowM === 0 ? -6 : 1 - dowM;
    const mondayM = new Date(nowM.getFullYear(), nowM.getMonth(), nowM.getDate() + offM);
    const mondayMStr = mondayM.toISOString().split("T")[0];
    for (const user of mockUsers) {
      const already = mockExemptions.some(
        (e) => e.user_id === user.id && e.granted_at.split("T")[0] >= mondayMStr
      );
      if (!already) {
        mockExemptions.push({
          id: Math.random().toString(36).slice(2),
          user_id: user.id,
          reason: `${nowM.getMonth() + 1}월 ${Math.ceil(nowM.getDate() / 7)}주차 면제권`,
          granted_at: nowM.toISOString(),
          used_at: null,
          used_for_date: null,
        });
      }
    }

    const result = mockUsers.map((user) => {
      // 오늘 체크인
      const todayCheckin = mockCheckins.find((c) => {
        const t = new Date(c.checkin_time);
        return c.user_id === user.id && t >= startOfDay && t < endOfDay;
      });

      // 오늘 면제권 사용
      const todayExemption = mockExemptions.find(
        (e) => e.user_id === user.id && e.used_for_date === todayStr
      );

      // 남은 면제권 (used_for_date가 null인 것)
      const remainingExemptions = mockExemptions.filter(
        (e) => e.user_id === user.id && e.used_for_date === null
      ).length;

      // 누적 벌금
      const totalPenalty = mockCheckins
        .filter((c) => c.user_id === user.id)
        .reduce((sum, c) => sum + (c.penalty || 0), 0);

      let todayStatus: "on_time" | "late" | "exemption" | "absent" = "absent";
      let checkinTime: string | null = null;
      let todayPenalty = 0;
      let exemptionReason: string | null = null;

      if (todayExemption) {
        todayStatus = "exemption";
        exemptionReason = todayExemption.reason;
      } else if (todayCheckin) {
        todayStatus = todayCheckin.status === "late" ? "late" : "on_time";
        checkinTime = todayCheckin.checkin_time;
        todayPenalty = todayCheckin.penalty || 0;
      }

      return {
        id: user.id,
        name: user.name,
        batch: user.batch,
        todayStatus,
        checkinTime,
        todayPenalty,
        totalPenalty,
        remainingExemptions,
        exemptionReason,
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return NextResponse.json(result);
  }

  // Supabase 모드
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("*");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // ── 주간 면제권 자동 지급 (이번 주 월요일 기준, 전체 유저 대상) ──
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const thisMondayStr = thisMonday.toISOString().split("T")[0];

  // 이번 주에 이미 지급된 면제권: user_id 목록 가져오기
  const { data: alreadyGranted } = await supabase
    .from("exemptions")
    .select("user_id")
    .gte("granted_at", `${thisMondayStr}T00:00:00.000Z`);

  const alreadyGrantedIds = new Set((alreadyGranted || []).map((e) => e.user_id));

  // 아직 지급 안 된 유저에게 지급
  const toGrant = (users || []).filter((u) => !alreadyGrantedIds.has(u.id));
  if (toGrant.length > 0) {
    const weekLabel = `${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차 면제권`;
    await supabase.from("exemptions").insert(
      toGrant.map((u) => ({
        user_id: u.id,
        reason: weekLabel,
        granted_at: now.toISOString(),
      }))
    );
  }
  // ────────────────────────────────────────────────────────────────

  // 오늘 체크인
  const { data: checkins, error: checkinsError } = await supabase
    .from("checkins")
    .select("*")
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString());

  if (checkinsError) {
    return NextResponse.json({ error: checkinsError.message }, { status: 500 });
  }

  // 오늘 사용된 면제권
  const { data: todayExemptions, error: exemptionsError } = await supabase
    .from("exemptions")
    .select("*")
    .eq("used_for_date", todayStr);

  if (exemptionsError) {
    return NextResponse.json({ error: exemptionsError.message }, { status: 500 });
  }

  // 미사용 면제권 (남은 개수 계산용)
  const { data: unusedExemptions, error: unusedError } = await supabase
    .from("exemptions")
    .select("user_id")
    .is("used_for_date", null);

  if (unusedError) {
    return NextResponse.json({ error: unusedError.message }, { status: 500 });
  }

  // 전체 체크인 (누적 벌금 계산용)
  const { data: allCheckins, error: allCheckinsError } = await supabase
    .from("checkins")
    .select("user_id, penalty");

  if (allCheckinsError) {
    return NextResponse.json({ error: allCheckinsError.message }, { status: 500 });
  }

  // 누적 벌금 맵
  const penaltyMap: Record<string, number> = {};
  allCheckins?.forEach((c) => {
    penaltyMap[c.user_id] = (penaltyMap[c.user_id] || 0) + (c.penalty || 0);
  });

  // 남은 면제권 맵
  const unusedMap: Record<string, number> = {};
  unusedExemptions?.forEach((e) => {
    unusedMap[e.user_id] = (unusedMap[e.user_id] || 0) + 1;
  });

  // 오늘 체크인 맵
  const checkinMap: Record<string, (typeof checkins)[0]> = {};
  checkins?.forEach((c) => {
    checkinMap[c.user_id] = c;
  });

  // 오늘 면제권 맵
  const exemptionMap: Record<string, (typeof todayExemptions)[0]> = {};
  todayExemptions?.forEach((e) => {
    exemptionMap[e.user_id] = e;
  });

  const result = (users || []).map((user) => {
    const todayCheckin = checkinMap[user.id];
    const todayExemption = exemptionMap[user.id];

    let todayStatus: "on_time" | "late" | "exemption" | "absent" = "absent";
    let checkinTime: string | null = null;
    let todayPenalty = 0;
    let exemptionReason: string | null = null;

    if (todayExemption) {
      todayStatus = "exemption";
      exemptionReason = todayExemption.reason;
    } else if (todayCheckin) {
      todayStatus = todayCheckin.status === "late" ? "late" : "on_time";
      checkinTime = todayCheckin.checkin_time;
      todayPenalty = todayCheckin.penalty || 0;
    }

    return {
      id: user.id,
      name: user.name,
      batch: user.batch,
      todayStatus,
      checkinTime,
      todayPenalty,
      totalPenalty: penaltyMap[user.id] || 0,
      remainingExemptions: unusedMap[user.id] || 0,
      exemptionReason,
    };
  });

  result.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return NextResponse.json(result);
}
