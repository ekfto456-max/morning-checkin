import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculatePenalty, getKSTDayRange } from "@/lib/penalty";
import { isUsingMockMode, mockCheckins, generateId, getMockSeal, updateMockSeal } from "@/lib/mock-store";
import { grantWeeklyExemptions } from "@/lib/weekly-exemption";

// 출석 시 물개 EXP 지급
async function addSealExp(status: string, checkinHour: number, userId: string) {
  let amount = 0;

  if (status === "on_time") {
    amount = checkinHour < 7 ? 4 : 2; // 새벽 기상 +4, 정시 +2
  } else {
    amount = -2; // 지각 -2 EXP
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
    if (streak >= 5) amount += 1;
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

// 물개 피드 로그 삽입
async function insertSealLog(
  type: string,
  emoji: string,
  content: string,
  userId?: string
) {
  try {
    const insertData: { type: string; emoji: string; content: string; user_id?: string } = {
      type,
      emoji,
      content,
    };
    if (userId) insertData.user_id = userId;
    await supabase.from("seal_logs").insert(insertData);
  } catch {
    // silently fail - log is optional
  }
}

// 출석 시간 기반 메시지 생성
function getCheckinMessage(name: string, status: string, hour: number, penalty: number): { type: string; emoji: string; content: string } {
  if (status === "on_time") {
    if (hour < 7) {
      return {
        type: "checkin_ontime",
        emoji: "✅",
        content: `와!! ${name}님이 새벽부터 일어났어! 뭉치도 놀랐어 😲`,
      };
    } else if (hour < 8) {
      return {
        type: "checkin_ontime",
        emoji: "✅",
        content: `일찍 일어난 ${name}님! 물개도 기지개 켜는 중 🌅`,
      };
    } else if (hour < 9) {
      return {
        type: "checkin_ontime",
        emoji: "✅",
        content: `${name}님 굿모닝~ 오늘도 파이팅! 💪`,
      };
    } else {
      return {
        type: "checkin_ontime",
        emoji: "✅",
        content: `${name}님 정시 출석! 뭉치가 박수쳐줄게 👏`,
      };
    }
  } else {
    // late
    if (penalty <= 2000) {
      return {
        type: "checkin_late",
        emoji: "⏰",
        content: `${name}님... 조금만 더 일찍 일어나지 😅 2,000원이야`,
      };
    } else {
      return {
        type: "checkin_late",
        emoji: "⏰",
        content: `${name}님 많이 늦었어... 뭉치 걱정했잖아 😢 5,000원`,
      };
    }
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

  // 오늘 첫 출석자인지 확인 (insert 전)
  const { count: todayCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString());

  const isFirstToday = (todayCount ?? 0) === 0;

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

  // 유저 이름 조회
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();
  const userName = userData?.name ?? "멤버";

  // 출석 seal_log 삽입
  const logInfo = getCheckinMessage(userName, status, now.getHours(), penalty);
  await insertSealLog(logInfo.type, logInfo.emoji, logInfo.content, userId);

  // 오늘 첫 출석자 로그
  if (isFirstToday) {
    await insertSealLog(
      "first_today",
      "🥇",
      `오늘의 첫 출석자는 ${userName}님! 🥇 뭉치가 물고기 상 줄게 🐟`,
      userId
    );
  }

  // 전원 정시 출석 여부 확인 → 팀 보너스 +30 EXP
  if (status === "on_time") {
    const { count: memberCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    const { count: onTimeCount } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("status", "on_time")
      .gte("checkin_time", startOfDay.toISOString())
      .lt("checkin_time", endOfDay.toISOString());

    if (memberCount && onTimeCount && onTimeCount >= memberCount && memberCount > 1) {
      // 실제 EXP +30 지급
      const { data: seal } = await supabase.from("seal").select("*").single();
      if (seal) {
        await supabase
          .from("seal")
          .update({ exp: seal.exp + 6 })
          .eq("id", seal.id);
      }
      await insertSealLog(
        "all_present",
        "⚡",
        `⚡ 전원 정시 출석 달성! 뭉치가 감동받았어 ❤️ 팀 보너스 +6 EXP!`
      );
    }
  }

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

  // 앱 접속 시마다 주간 면제권 자동 지급 (현황 탭 미방문 시에도 보장)
  await grantWeeklyExemptions();

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
