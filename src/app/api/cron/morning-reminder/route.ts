import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import { getKSTDayRange } from "@/lib/penalty";

export async function GET(request: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  // Vercel Cron 보안 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { startOfDay, endOfDay } = getKSTDayRange();

  // 오늘 아직 출석 안 한 유저 목록
  const { data: allUsers } = await supabase.from("users").select("id");
  const { data: todayCheckins } = await supabase
    .from("checkins")
    .select("user_id")
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString());

  const checkedInIds = new Set((todayCheckins || []).map((c) => c.user_id));
  const absentIds = (allUsers || [])
    .map((u) => u.id)
    .filter((id) => !checkedInIds.has(id));

  if (absentIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "전원 출석 완료" });
  }

  // 미출석 유저의 푸시 구독 가져오기
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", absentIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "구독자 없음" });
  }

  const payload = JSON.stringify({
    title: "💀 죽기스 출석 알림",
    body: "10:04 마감까지 34분 남았어요! 얼른 출석 인증하세요 🦭",
    url: "/",
  });

  let sent = 0;
  const expired: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        // 만료된 구독 정리
        if (err && typeof err === "object" && "statusCode" in err &&
            (err.statusCode === 410 || err.statusCode === 404)) {
          expired.push(sub.endpoint);
        }
      }
    })
  );

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ sent, expired: expired.length });
}
