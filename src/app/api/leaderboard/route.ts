import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockUsers, mockCheckins } from "@/lib/mock-store";

export async function GET() {
  // Mock 모드
  if (isUsingMockMode()) {
    const leaderboard = mockUsers.map((user) => {
      const totalPenalty = mockCheckins
        .filter((c) => c.user_id === user.id)
        .reduce((sum, c) => sum + (c.penalty || 0), 0);
      return {
        id: user.id,
        name: user.name,
        totalPenalty,
      };
    }).sort((a, b) => a.totalPenalty - b.totalPenalty);

    return NextResponse.json(leaderboard);
  }

  // Supabase 모드
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const { data: checkins, error: checkinsError } = await supabase
    .from("checkins")
    .select("user_id, penalty");

  if (checkinsError) {
    return NextResponse.json(
      { error: checkinsError.message },
      { status: 500 }
    );
  }

  const penaltyMap: Record<string, number> = {};
  checkins?.forEach((c) => {
    penaltyMap[c.user_id] = (penaltyMap[c.user_id] || 0) + (c.penalty || 0);
  });

  const leaderboard = users
    ?.map((user) => ({
      id: user.id,
      name: user.name,
      totalPenalty: penaltyMap[user.id] || 0,
    }))
    .sort((a, b) => a.totalPenalty - b.totalPenalty);

  return NextResponse.json(leaderboard);
}
