import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockExemptions, generateId } from "@/lib/mock-store";

// GET: 사용자의 미사용 면제권 조회
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id가 필요합니다" },
      { status: 400 }
    );
  }

  // Mock 모드
  if (isUsingMockMode()) {
    const unused = mockExemptions.filter(
      (e) => e.user_id === userId && e.used_at === null
    );
    return NextResponse.json({ exemptions: unused });
  }

  // Supabase 모드
  const { data, error } = await supabase
    .from("exemptions")
    .select("*")
    .eq("user_id", userId)
    .is("used_at", null)
    .order("granted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exemptions: data });
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
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

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

    // 이미 오늘 면제권을 사용했는지 확인
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

  // Supabase 모드: 오늘 이미 면제권 사용했는지 확인
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

  // 면제권 사용 처리
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
