import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";
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

  // 오늘 아직 출석 안 한 유저 목록 (custom_deadline_time 포함)
  const { data: allUsers } = await supabase.from("users").select("id, name, custom_deadline_time");
  const { data: todayCheckins } = await supabase
    .from("checkins")
    .select("user_id")
    .gte("checkin_time", startOfDay.toISOString())
    .lt("checkin_time", endOfDay.toISOString());

  const checkedInIds = new Set((todayCheckins || []).map((c) => c.user_id));
  const absentUsers = (allUsers || []).filter((u) => !checkedInIds.has(u.id));

  if (absentUsers.length === 0) {
    return NextResponse.json({ sent: 0, message: "전원 출석 완료" });
  }

  const absentIds = absentUsers.map((u) => u.id);
  const userMap = new Map(absentUsers.map((u) => [u.id, u]));

  // 미출석 유저의 푸시 구독 가져오기
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", absentIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "구독자 없음" });
  }

  // 개인 마감 시간 기준 알림 메시지 생성
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);

  const getDeadlineMessage = (customDeadline?: string | null) => {
    const dl = customDeadline || "10:03";
    const [h, m] = dl.split(":").map(Number);
    const deadlineMinutes = h * 60 + m;
    const nowMinutes = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();
    const remaining = deadlineMinutes - nowMinutes;
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const timeStr = `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
    if (remaining > 0) {
      return `${timeStr} 마감까지 ${remaining}분 남았어요! 얼른 출석 인증하세요 🦭`;
    }
    return `${timeStr} 마감! 아직 출석 안 하셨어요 😱`;
  };

  let sent = 0;
  const expired: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      const user = userMap.get(sub.user_id);
      const body = getDeadlineMessage(user?.custom_deadline_time);
      const payload = JSON.stringify({
        title: "💀 죽기스 출석 알림",
        body,
        url: "/",
      });
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
