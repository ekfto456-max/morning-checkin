import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockUsers, mockCheckins } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function GET() {
  // Mock 모드
  if (isUsingMockMode()) {
    const leaderboard = mockUsers.map((user) => {
      const userCheckins = mockCheckins.filter((c) => c.user_id === user.id);
      const totalPenalty = userCheckins.reduce((sum, c) => sum + (c.penalty || 0), 0);
      const avgCheckinMinutes = userCheckins.length > 0
        ? userCheckins.reduce((sum, c) => {
            const d = new Date(c.checkin_time);
            return sum + d.getHours() * 60 + d.getMinutes();
          }, 0) / userCheckins.length
        : 9999;
      return { id: user.id, name: user.name, totalPenalty, avgCheckinMinutes };
    }).sort((a, b) => a.totalPenalty - b.totalPenalty || a.avgCheckinMinutes - b.avgCheckinMinutes);

    return NextResponse.json(leaderboard);
  }

  // Supabase 모드
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // checkin_time 추가로 가져와서 평균 기상 시간 계산
  const { data: checkins, error: checkinsError } = await supabase
    .from("checkins")
    .select("user_id, penalty, checkin_time");

  if (checkinsError) {
    return NextResponse.json({ error: checkinsError.message }, { status: 500 });
  }

  const penaltyMap: Record<string, number> = {};
  const checkinMinutesMap: Record<string, number[]> = {};

  checkins?.forEach((c) => {
    penaltyMap[c.user_id] = (penaltyMap[c.user_id] || 0) + (c.penalty || 0);
    const d = new Date(c.checkin_time);
    // KST 변환 (UTC+9)
    const kstMinutes = ((d.getUTCHours() + 9) % 24) * 60 + d.getUTCMinutes();
    if (!checkinMinutesMap[c.user_id]) checkinMinutesMap[c.user_id] = [];
    checkinMinutesMap[c.user_id].push(kstMinutes);
  });

  const leaderboard = users
    ?.map((user) => {
      const times = checkinMinutesMap[user.id] || [];
      const avgCheckinMinutes = times.length > 0
        ? times.reduce((s, m) => s + m, 0) / times.length
        : 9999; // 출석 없으면 동점 중 맨 뒤
      return {
        id: user.id,
        name: user.name,
        totalPenalty: penaltyMap[user.id] || 0,
        avgCheckinMinutes,
      };
    })
    .sort((a, b) => a.totalPenalty - b.totalPenalty || a.avgCheckinMinutes - b.avgCheckinMinutes);

  return NextResponse.json(leaderboard);
}
