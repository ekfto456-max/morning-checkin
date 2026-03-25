import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 특정 체크인의 댓글 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkin_id = searchParams.get("checkin_id");

  if (!checkin_id) {
    return NextResponse.json({ error: "checkin_id가 필요합니다" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, user_id, users(name, avatar_url)")
    .eq("checkin_id", checkin_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const formatted = (data || []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    user_name: c.users?.name || "알 수 없음",
    avatar_url: c.users?.avatar_url || null,
  }));

  return NextResponse.json(formatted);
}

// POST: 댓글 작성
export async function POST(request: NextRequest) {
  const { checkin_id, user_id, content } = await request.json();

  if (!checkin_id || !user_id || !content?.trim()) {
    return NextResponse.json({ error: "필수 값이 누락됐습니다" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ checkin_id, user_id, content: content.trim() })
    .select("id, content, created_at, user_id, users(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    content: data.content,
    created_at: data.created_at,
    user_id: data.user_id,
    user_name: (data as any).users?.name || "알 수 없음",
    avatar_url: (data as any).users?.avatar_url || null,
  });
}
