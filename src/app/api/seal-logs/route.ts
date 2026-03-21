import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("seal_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, content, emoji, user_id } = body;

  if (!type || !content || !emoji) {
    return NextResponse.json(
      { error: "type, content, emoji가 필요합니다" },
      { status: 400 }
    );
  }

  const insertData: {
    type: string;
    content: string;
    emoji: string;
    user_id?: string;
  } = { type, content, emoji };

  if (user_id) {
    insertData.user_id = user_id;
  }

  const { data, error } = await supabase
    .from("seal_logs")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
