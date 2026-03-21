import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockUsers, generateId } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id 필요" }, { status: 400 });

  if (isUsingMockMode()) {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    return NextResponse.json(user);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, batch, purpose, avatar_url")
    .eq("id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const { id, name, batch, purpose, avatar_url } = await request.json();
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  if (isUsingMockMode()) {
    const user = mockUsers.find((u) => u.id === id);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    if (name) user.name = name.trim();
    if (batch !== undefined) user.batch = batch.trim();
    if (purpose !== undefined) user.purpose = purpose.trim();
    return NextResponse.json(user);
  }

  const updates: Record<string, string> = {};
  if (name) updates.name = name.trim();
  if (batch !== undefined) updates.batch = batch.trim();
  if (purpose !== undefined) updates.purpose = purpose.trim();
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { name, batch, purpose } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "이름을 입력해주세요" },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  const trimmedBatch = (batch || "").trim();
  const trimmedPurpose = (purpose || "").trim();

  // Mock 모드: Supabase 없이 로컬 메모리 사용
  if (isUsingMockMode()) {
    const existing = mockUsers.find((u) => u.name === trimmedName);
    if (existing) {
      return NextResponse.json(existing);
    }

    const newUser = {
      id: generateId(),
      name: trimmedName,
      batch: trimmedBatch,
      purpose: trimmedPurpose,
      created_at: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return NextResponse.json(newUser);
  }

  // Supabase 모드
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("name", trimmedName)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: trimmedName,
      batch: trimmedBatch,
      purpose: trimmedPurpose,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
