import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockExemptions, generateId } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET: 사용자의 면제권 조회 (미사용 + 주간 자동 지급 체크)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id가 필요합니다" },
      { status: 400 }
    );
  }

  // 이번 주 월요일 계산 (KST 기준)
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const dayOfWeek = nowKST.getUTCDay(); // 0=일, 1=월, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMondayKST = new Date(nowKST.getTime() + mondayOffset * 86400 * 1000);
  const thisMondayStr = thisMondayKST.toISOString().split("T")[0];

  if (isUsingMockMode()) {
    // 이번 주에 이미 지급했는지 확인
    const alreadyGrantedThisWeek = mockExemptions.some((e) => {
      const grantedDate = e.granted_at.split("T")[0];
      return e.user_id === userId && grantedDate >= thisMondayStr;
    });

    if (!alreadyGrantedThisWeek) {
      // 이번 주 면제권 자동 지급
      mockExemptions.push({
        id: generateId(),
        user_id: userId,
        reason: `${nowKST.getUTCMonth() + 1}월 ${Math.ceil(nowKST.getUTCDate() / 7)}주차 면제권`,
        granted_at: nowKST.toISOString(),
        used_at: null,
        used_for_date: null,
      });
    }

    const unused = mockExemptions.filter(
      (e) => e.user_id === userId && e.used_at === null
    );
    const used = mockExemptions.filter(
      (e) => e.user_id === userId && e.used_at !== null
    );
    return NextResponse.json({ exemptions: unused, usedExemptions: used });
  }

  // 미사용 면제권 조회 — 이번 주 지급분만 (지난 주 소멸)
  const { data: unused, error } = await supabase
    .from("exemptions")
    .select("*")
    .eq("user_id", userId)
    .is("used_at", null)
    .gte("granted_at", `${thisMondayStr}T00:00:00.000Z`)
    .order("granted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 사용된 면제권도 조회
  const { data: used } = await supabase
    .from("exemptions")
    .select("*")
    .eq("user_id", userId)
    .not("used_at", "is", null)
    .order("used_at", { ascending: false })
    .limit(5);

  return NextResponse.json({ exemptions: unused || [], usedExemptions: used || [] });
}

// POST: 면제권 사용 (오늘 날짜에 대해)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, exemption_id } = body;

  if (!user_id || !exemption_id) {
    return NextResponse.json(
      { error: "user_id와 exemption_id가 필요합니다" },
      { status: 400 }
    );
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 주말 체크 (KST 기준)
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const dayOfWeek = nowKST.getUTCDay(); // 0=일, 6=토
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json(
      { error: "주말에는 면제권을 사용할 수 없습니다" },
      { status: 403 }
    );
  }

  // Mock 모드
  if (isUsingMockMode()) {
    const exemption = mockExemptions.find(
      (e) => e.id === exemption_id && e.user_id === user_id && e.used_at === null
    );

    if (!exemption) {
      return NextResponse.json(
        { error: "사용 가능한 면제권을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const alreadyUsedToday = mockExemptions.find(
      (e) => e.user_id === user_id && e.used_for_date === todayStr
    );

    if (alreadyUsedToday) {
      return NextResponse.json(
        { error: "오늘은 이미 면제권을 사용했습니다" },
        { status: 409 }
      );
    }

    exemption.used_at = today.toISOString();
    exemption.used_for_date = todayStr;

    return NextResponse.json({ exemption });
  }

  // Supabase 모드
  const { data: alreadyUsed } = await supabase
    .from("exemptions")
    .select("*")
    .eq("user_id", user_id)
    .eq("used_for_date", todayStr)
    .single();

  if (alreadyUsed) {
    return NextResponse.json(
      { error: "오늘은 이미 면제권을 사용했습니다" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("exemptions")
    .update({
      used_at: today.toISOString(),
      used_for_date: todayStr,
    })
    .eq("id", exemption_id)
    .eq("user_id", user_id)
    .is("used_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "사용 가능한 면제권을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({ exemption: data });
}
