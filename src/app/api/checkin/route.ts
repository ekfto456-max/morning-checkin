import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculatePenalty } from "@/lib/penalty";
import { isUsingMockMode, mockCheckins, generateId, getMockSeal, updateMockSeal } from "@/lib/mock-store";

// 출석 시 물개 EXP 지급
async function addSealExp(status: string, checkinHour: number) {
  let amount = 0;
  let reason = "";

  if (status === "on_time") {
    amount = 10;
    reason = "정시 출석";
    if (checkinHour < 7) {
      amount = 20;
      reason = "새벽 기상 보너스!";
    }
  }
  // 지각은 EXP 0

  if (amount <= 0) return;

  if (isUsingMockMode()) {
    const seal = getMockSeal();
    updateMockSeal({ exp: seal.exp + amount });
    return;
  }

  // Supabase: 물개 EXP 증가
  const { data: seal } = await supabase.from("seal").select("*").single();
  if (seal) {
    await supabase
      .from("seal")
      .update({ exp: seal.exp + amount })
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

  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

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
    await addSealExp(status, now.getHours());

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
  await addSealExp(status, now.getHours());

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

  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

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
