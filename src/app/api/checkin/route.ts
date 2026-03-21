import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculatePenalty, getKSTDayRange } from "@/lib/penalty";
import { isUsingMockMode, mockCheckins, generateId, getMockSeal, updateMockSeal } from "@/lib/mock-store";

// 출석 시 물개 EXP 지급
async function addSealExp(status: string, checkinHour: number, userId: string) {
  let amount = 0;

  if (status === "on_time") {
    amount = checkinHour < 7 ? 20 : 10; // 새벽 기상 +20, 정시 +10
  } else {
    amount = -10; // 지각 -10 EXP
  }

  if (isUsingMockMode()) {
    const seal = getMockSeal();
    updateMockSeal({ exp: Math.max(0, seal.exp + amount) });
    return;
  }

  // 연속 출석 5일 이상이면 추가 +5 EXP (정시 출석일 때만)
  if (status === "on_time") {
    const { getKSTDayRange } = await import("@/lib/penalty");
    let streak = 0;
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "on_time")
        .gte("checkin_time", start.toISOString())
        .lte("checkin_time", end.toISOString())
        .single();
      if (data) streak++;
      else break;
    }
    if (streak >= 5) amount += 5;
  }

  // Supabase: 물개 EXP 업데이트
  const { data: seal } = await supabase.from("seal").select("*").single();
  if (seal) {
    await supabase
      .from("seal")
      .update({ exp: Math.max(0, seal.exp + amount) })
      .eq("id", seal.id);
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = formData.get("user_id") as string;
  const image = formData.get("image") as File;

  if (!userId || !image) {
    return NextResponse.json(
      { error: "user_id와 이미지가 필요합니다" },
      { status: 400 }
    );
  }

  // KST 기준 오늘 범위
  const { startOfDay, endOfDay } = getKSTDayRange();

  // Mock 모드
  if (isUsingMockMode()) {
    const existing = mockCheckins.find((c) => {
      const t = new Date(c.checkin_time);
      return c.user_id === userId && t >= startOfDay && t < endOfDay;
    });

    if (existing) {
      return NextResponse.json(
        { error: "오늘 이미 출석했습니다!", checkin: existing },
        { status: 409 }
      );
    }

    const now = new Date();
    const { status, penalty } = calculatePenalty(now);

    // 이미지를 base64 data URL로 변환 (로컬 저장)
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:${image.type};base64,${base64}`;

    const newCheckin = {
      id: generateId(),
      user_id: userId,
      image_url: imageUrl,
      checkin_time: now.toISOString(),
      status,
      penalty,
    };
    mockCheckins.push(newCheckin);

    // 물개 EXP 지급
    await addSealExp(status, now.getHours(), userId);

    return NextResponse.json(newCheckin);
  }

  // Supabase 모드
  const { data: existing } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "오늘 이미 출석했습니다!", checkin: existing },
      { status: 409 }
    );
  }

  const fileExt = image.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const arrayBuffer = await image.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("checkin-images")
    .upload(fileName, buffer, {
      contentType: image.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "이미지 업로드 실패: " + uploadError.message },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("checkin-images")
    .getPublicUrl(fileName);

  const now = new Date();
  const { status, penalty } = calculatePenalty(now);

  const { data, error } = await supabase
    .from("checkins")
    .insert({
      user_id: userId,
      image_url: urlData.publicUrl,
      checkin_time: now.toISOString(),
      status,
      penalty,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 물개 EXP 지급
  await addSealExp(status, now.getHours(), userId);

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id가 필요합니다" },
      { status: 400 }
    );
  }

  // KST 기준 오늘 범위
  const { startOfDay, endOfDay } = getKSTDayRange();

  // Mock 모드
  if (isUsingMockMode()) {
    const todayCheckin = mockCheckins.find((c) => {
      const t = new Date(c.checkin_time);
      return c.user_id === userId && t >= startOfDay && t < endOfDay;
    }) || null;

    const totalPenalty = mockCheckins
      .filter((c) => c.user_id === userId)
      .reduce((sum, c) => sum + (c.penalty || 0), 0);

    return NextResponse.json({ todayCheckin, totalPenalty });
  }

  // Supabase 모드
  const { data: todayCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString())
    .single();

  const { data: allCheckins } = await supabase
    .from("checkins")
    .select("penalty")
    .eq("user_id", userId);

  const totalPenalty =
    allCheckins?.reduce((sum, c) => sum + (c.penalty || 0), 0) ?? 0;

  return NextResponse.json({
    todayCheckin: todayCheckin || null,
    totalPenalty,
  });
}
