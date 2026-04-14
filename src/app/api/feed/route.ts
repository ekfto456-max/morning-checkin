import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockCheckins, mockUsers, mockExemptions } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// 전체 피드 아카이브 (페이지네이션)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  if (isUsingMockMode()) {
    const allItems = [
      ...mockCheckins.map((c) => {
        const user = mockUsers.find((u) => u.id === c.user_id);
        return { ...c, user_name: user?.name || "알 수 없음", type: "checkin" as const };
      }),
    ].sort((a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime());

    return NextResponse.json({
      items: allItems.slice(offset, offset + PAGE_SIZE),
      total: allItems.length,
      page,
      totalPages: Math.ceil(allItems.length / PAGE_SIZE),
    });
  }

  // 전체 체크인 (날짜 필터 없음)
  const { data: checkins } = await supabase
    .from("checkins")
    .select("*, users(name, avatar_url)")
    .order("checkin_time", { ascending: false });

  // 전체 면제권
  const { data: exemptions } = await supabase
    .from("exemptions")
    .select("*, users(name, avatar_url)")
    .not("used_at", "is", null);

  // 전체 게시글 (JOIN 없이 가져와서 user_id 기반으로 별도 조회)
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("[feed] posts fetch error:", postsError);
  }

  // posts에 등장하는 user_id들의 유저 정보를 별도로 조회
  const postUserIds = [...new Set((posts || []).map((p: Record<string, unknown>) => p.user_id as string).filter(Boolean))];
  let postUsersMap: Record<string, { name: string; avatar_url: string | null }> = {};
  if (postUserIds.length > 0) {
    const { data: postUsers } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", postUserIds);
    (postUsers || []).forEach((u: Record<string, unknown>) => {
      postUsersMap[u.id as string] = {
        name: u.name as string,
        avatar_url: (u.avatar_url as string) || null,
      };
    });
  }

  const allItems = [
    ...(checkins || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      user_id: c.user_id,
      user_name: (c.users as Record<string, string>)?.name || "알 수 없음",
      avatar_url: (c.users as Record<string, string>)?.avatar_url || null,
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
      avatar_url: (e.users as Record<string, string>)?.avatar_url || null,
      checkin_time: (e.used_at || e.granted_at) as string,
      type: "exemption" as const,
      reason: e.reason,
    })),
    ...(posts || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      user_id: p.user_id,
      user_name: postUsersMap[p.user_id as string]?.name || "알 수 없음",
      avatar_url: postUsersMap[p.user_id as string]?.avatar_url || null,
      checkin_time: p.created_at as string,
      content: p.content,
      image_url: p.image_url,
      type: "post" as const,
    })),
  ].sort((a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime());

  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return NextResponse.json({
    items: allItems.slice(offset, offset + PAGE_SIZE),
    total,
    page,
    totalPages,
  });
}
