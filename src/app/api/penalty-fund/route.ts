import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 전체 벌금 합계 + 납부 내역
export async function GET() {
  try {
    // 전체 미납 벌금 합계 (checkins 기준)
    const { data: checkins } = await supabase
      .from("checkins")
      .select("penalty, user_id, users(name)");

    // 유저별 벌금 합계
    const userPenalties: Record<string, { name: string; total: number }> = {};
    let grandTotal = 0;

    for (const c of checkins || []) {
      if (!c.user_id) continue;
      const usersData = c.users as unknown as { name: string } | null;
      const name = usersData?.name || "알 수 없음";
      if (!userPenalties[c.user_id]) {
        userPenalties[c.user_id] = { name, total: 0 };
      }
      userPenalties[c.user_id].total += c.penalty || 0;
      grandTotal += c.penalty || 0;
    }

    // 납부 내역
    const { data: payments } = await supabase
      .from("penalty_payments")
      .select("*, users(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    // 납부 완료 합계
    const paidTotal = (payments || [])
      .filter((p) => p.confirmed)
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      grandTotal,
      paidTotal,
      unpaidTotal: grandTotal - paidTotal,
      userPenalties: Object.entries(userPenalties).map(([id, v]) => ({
        user_id: id,
        name: v.name,
        total: v.total,
      })),
      payments: (payments || []).map((p) => ({
        id: p.id,
        name: (p.users as unknown as { name: string } | null)?.name || "알 수 없음",
        amount: p.amount,
        confirmed: p.confirmed,
        note: p.note,
        proof_image_url: p.proof_image_url,
        created_at: p.created_at,
        payment_date: p.payment_date,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 납부 등록
export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, proof_image_url, note } = await req.json();

    if (!user_id || !amount) {
      return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("penalty_payments")
      .insert({
        user_id,
        amount,
        proof_image_url: proof_image_url || null,
        note: note || null,
        confirmed: true, // 증빙 제출 즉시 자동 확인
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "납부 등록 실패" }, { status: 500 });
  }
}
