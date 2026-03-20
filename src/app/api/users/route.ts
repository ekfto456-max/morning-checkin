import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUsingMockMode, mockUsers, generateId } from "@/lib/mock-store";

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
