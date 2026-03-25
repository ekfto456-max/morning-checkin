import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const checkinId = request.nextUrl.searchParams.get("checkin_id");
  if (!checkinId) return NextResponse.json({}, { status: 400 });

  const { data } = await supabase
    .from("reactions")
    .select("emoji, user_id")
    .eq("checkin_id", checkinId);

  // { "👍": ["user1", "user2"], "❤️": ["user3"] }
  const result: Record<string, string[]> = {};
  (data || []).forEach(({ emoji, user_id }) => {
    if (!result[emoji]) result[emoji] = [];
    result[emoji].push(user_id);
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { checkin_id, user_id, emoji } = await request.json();
  if (!checkin_id || !user_id || !emoji) return NextResponse.json({ error: "필드 누락" }, { status: 400 });

  const { error } = await supabase
    .from("reactions")
    .upsert({ checkin_id, user_id, emoji }, { onConflict: "checkin_id,user_id,emoji" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { checkin_id, user_id, emoji } = await request.json();
  if (!checkin_id || !user_id || !emoji) return NextResponse.json({ error: "필드 누락" }, { status: 400 });

  await supabase
    .from("reactions")
    .delete()
    .eq("checkin_id", checkin_id)
    .eq("user_id", user_id)
    .eq("emoji", emoji);

  return NextResponse.json({ ok: true });
}
