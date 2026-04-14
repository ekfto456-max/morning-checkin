import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, users(name)")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten user name
  const messages = (data || []).map((m: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    users: { name: string } | { name: string }[] | null;
  }) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    user_id: m.user_id,
    user_name: Array.isArray(m.users)
      ? (m.users[0]?.name ?? "Unknown")
      : (m.users as { name: string } | null)?.name ?? "Unknown",
  }));

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, content } = body;

  if (!user_id || !content) {
    return NextResponse.json(
      { error: "user_id와 content가 필요합니다" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ user_id, content })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
