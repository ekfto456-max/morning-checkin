import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";
import { isUsingMockMode, mockUsers } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = formData.get("user_id") as string;
  const image = formData.get("image") as File;

  if (!userId || !image) {
    return NextResponse.json({ error: "user_id와 이미지가 필요합니다" }, { status: 400 });
  }

  if (isUsingMockMode()) {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    // Mock: return a fake URL
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const fakeUrl = `data:${image.type};base64,${base64}`;
    (user as unknown as Record<string, unknown>).avatar_url = fakeUrl;
    return NextResponse.json({ avatar_url: fakeUrl, user });
  }

  const fileExt = image.name.split(".").pop() || "jpg";
  const fileName = `avatars/avatar_${userId}.${fileExt}`;
  const arrayBuffer = await image.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // upsert so re-upload overwrites old file
  const { error: uploadError } = await supabase.storage
    .from("checkin-images")
    .upload(fileName, buffer, {
      contentType: image.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "이미지 업로드 실패: " + uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("checkin-images")
    .getPublicUrl(fileName);

  const avatarUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select()
    .single();

  // avatar_url 컬럼이 없어도 이미지 URL은 반환 (컬럼 추가 전 graceful fallback)
  if (error) {
    console.warn("avatar_url 저장 실패 (컬럼 없을 수 있음):", error.message);
    return NextResponse.json({ avatar_url: avatarUrl, user: null, warning: error.message });
  }

  return NextResponse.json({ avatar_url: avatarUrl, user: data });
}
