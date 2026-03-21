import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockCheckins, mockUsers, mockExemptions } from "@/lib/mock-store";

// 오늘의 인증샷 피드 (단톡방처럼)
export async function GET(request: NextRequest) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  if (isUsingMockMode()) {
    const todayCheckins = mockCheckins
      .filter((c) => {
        const t = new Date(c.checkin_time);
        return t >= startOfDay && t < endOfDay;
      })
      .map((c) => {
        const user = mockUsers.find((u) => u.id === c.user_id);
        return {
          ...c,
          user_name: user?.name || "알 수 없음",
          type: "checkin" as const,
        };
      });

    const todayExemptions = mockExemptions
      .filter((e) => {
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return e.used_for_date === dateStr;
      })
      .map((e) => {
        const user = mockUsers.find((u) => u.id === e.user_id);
        return {
          id: e.id,
          user_id: e.user_id,
          user_name: user?.name || "알 수 없음",
          checkin_time: e.used_at || e.granted_at,
          type: "exemption" as const,
          reason: e.reason,
        };
      });

    const feed = [...todayCheckins, ...todayExemptions].sort(
      (a, b) => new Date(a.checkin_time).getTime() - new Date(b.checkin_time).getTime()
    );

    return NextResponse.json(feed);
  }

  // Supabase 모드
  const { data: checkins } = await supabase
    .from("checkins")
    .select("*, users(name)")
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString())
    .order("checkin_time", { ascending: true });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: exemptions } = await supabase
    .from("exemptions")
    .select("*, users(name)")
    .eq("used_for_date", todayStr);

  const { data: posts } = await supabase
    .from("posts")
    .select("*, users(name)")
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", endOfDay.toISOString());

  const feed = [
    ...(checkins || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      user_id: c.user_id,
      user_name: (c.users as Record<string, string>)?.name || "알 수 없음",
      checkin_time: c.checkin_time as string,
      image_url: c.image_url,
      status: c.status,
      penalty: c.penalty,
      type: "checkin" as const,
    })),
    ...(exemptions || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      user_id: e.user_id,
      user_name: (e.users as Record<string, string>)?.name || "알 수 없음",
      checkin_time: (e.used_at || e.granted_at) as string,
      type: "exemption" as const,
      reason: e.reason,
    })),
    ...(posts || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      user_id: p.user_id,
      user_name: (p.users as Record<string, string>)?.name || "알 수 없음",
      checkin_time: p.created_at as string,
      content: p.content,
      image_url: p.image_url,
      type: "post" as const,
    })),
  ].sort(
    (a, b) => new Date(a.checkin_time).getTime() - new Date(b.checkin_time).getTime()
  );

  return NextResponse.json(feed);
}
