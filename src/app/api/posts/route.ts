import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 오늘의 포스트 목록
export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const { data, error } = await supabase
    .from("posts")
    .select("*, users(name)")
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", endOfDay.toISOString())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const formatted = (data || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    user_id: p.user_id,
    user_name: (p.users as Record<string, string>)?.name || "알 수 없음",
    content: p.content,
    image_url: p.image_url,
    created_at: p.created_at,
    type: "post" as const,
  }));

  return NextResponse.json(formatted);
}

// POST: 포스트 작성 (텍스트 + 선택적 이미지)
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let userId: string, content: string, imageUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    userId = formData.get("user_id") as string;
    content = formData.get("content") as string;
    const image = formData.get("image") as File | null;

    if (image && image.size > 0) {
      const ext = image.name.split(".").pop() || "jpg";
      const path = `posts/post_${userId}_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await image.arrayBuffer());

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("checkin-images")
        .upload(path, buffer, { contentType: image.type, upsert: false });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("checkin-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }
  } else {
    const body = await request.json();
    userId = body.user_id;
    content = body.content;
  }

  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: "user_id, content 필요" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, content: content.trim(), image_url: imageUrl })
    .select("*, users(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    user_id: data.user_id,
    user_name: (data as Record<string, unknown> & { users: { name: string } }).users?.name || "알 수 없음",
    content: data.content,
    image_url: data.image_url,
    created_at: data.created_at,
    type: "post" as const,
  });
}

// DELETE: 본인 게시글 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("id");
  const userId = searchParams.get("user_id");

  if (!postId || !userId) {
    return NextResponse.json({ error: "id, user_id 필요" }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
