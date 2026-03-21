import { supabase } from "@/lib/supabase";

/**
 * 이번 주 면제권을 아직 받지 못한 유저에게 자동 지급.
 * 여러 API에서 호출해도 중복 지급 없이 안전하게 동작.
 */
export async function grantWeeklyExemptions() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const thisMondayStr = thisMonday.toISOString().split("T")[0];

  const { data: users } = await supabase.from("users").select("id");
  if (!users || users.length === 0) return;

  const { data: alreadyGranted } = await supabase
    .from("exemptions")
    .select("user_id")
    .gte("granted_at", `${thisMondayStr}T00:00:00.000Z`);

  const alreadyGrantedIds = new Set((alreadyGranted || []).map((e) => e.user_id));
  const toGrant = users.filter((u) => !alreadyGrantedIds.has(u.id));

  if (toGrant.length > 0) {
    const weekLabel = `${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차 면제권`;
    await supabase.from("exemptions").insert(
      toGrant.map((u) => ({
        user_id: u.id,
        reason: weekLabel,
        granted_at: now.toISOString(),
      }))
    );
  }
}
