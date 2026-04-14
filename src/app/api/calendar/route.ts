import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";
import { isUsingMockMode, mockCheckins, mockExemptions } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET: 특정 월의 출석 및 면제 데이터 조회
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  const month = request.nextUrl.searchParams.get("month"); // YYYY-MM

  if (!userId || !month) {
    return NextResponse.json(
      { error: "user_id와 month(YYYY-MM)가 필요합니다" },
      { status: 400 }
    );
  }

  // 월의 시작일과 종료일 계산
  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1); // 다음 달 1일

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();
  const startDateStr = `${month}-01`;
  // 마지막 날 계산
  const lastDay = new Date(year, mon, 0).getDate();
  const endDateStr = `${month}-${String(lastDay).padStart(2, "0")}`;

  // Mock 모드
  if (isUsingMockMode()) {
    const checkins = mockCheckins.filter((c) => {
      const t = new Date(c.checkin_time);
      return c.user_id === userId && t >= startDate && t < endDate;
    });

    const exemptions = mockExemptions.filter((e) => {
      if (!e.used_for_date || e.user_id !== userId) return false;
      return e.used_for_date >= startDateStr && e.used_for_date <= endDateStr;
    });

    return NextResponse.json({ checkins, exemptions });
  }

  // Supabase 모드: 체크인 조회
  const { data: checkins, error: checkinError } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_time", startStr)
    .lt("checkin_time", endStr)
    .order("checkin_time", { ascending: true });

  if (checkinError) {
    return NextResponse.json(
      { error: checkinError.message },
      { status: 500 }
    );
  }

  // Supabase 모드: 면제 조회
  const { data: exemptions, error: exemptionError } = await supabase
    .from("exemptions")
    .select("*")
    .eq("user_id", userId)
    .gte("used_for_date", startDateStr)
    .lte("used_for_date", endDateStr)
    .not("used_at", "is", null);

  if (exemptionError) {
    return NextResponse.json(
      { error: exemptionError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    checkins: checkins || [],
    exemptions: exemptions || [],
  });
}
