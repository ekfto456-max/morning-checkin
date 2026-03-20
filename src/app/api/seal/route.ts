import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isUsingMockMode,
  getMockSeal,
  updateMockSeal,
  mockSealFeeds,
  generateId,
} from "@/lib/mock-store";

// 레벨 경험치 기준
const LEVEL_THRESHOLDS = [
  { level: 1, exp: 0 },
  { level: 2, exp: 100 },
  { level: 3, exp: 300 },
  { level: 4, exp: 600 },
  { level: 5, exp: 1000 },
];

function calculateLevel(exp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (exp >= threshold.exp) {
      level = threshold.level;
    }
  }
  return level;
}

function getTodayRange() {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );
  return { startOfDay, endOfDay };
}

export async function GET() {
  // Mock 모드
  if (isUsingMockMode()) {
    const seal = getMockSeal();
    const level = calculateLevel(seal.exp);
    return NextResponse.json({
      ...seal,
      level,
    });
  }

  // Supabase 모드
  const { data, error } = await supabase
    .from("seal")
    .select("*")
    .single();

  if (error) {
    // 물개가 없으면 기본값 생성
    if (error.code === "PGRST116") {
      const defaultSeal = {
        name: "뭉치",
        exp: 0,
        hp: 70,
        accessories: [],
      };
      const { data: newSeal, error: insertError } = await supabase
        .from("seal")
        .insert(defaultSeal)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ...newSeal,
        level: calculateLevel(newSeal.exp),
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    level: calculateLevel(data.exp),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === "feed") {
    return handleFeed(body);
  }

  if (action === "add_exp") {
    return handleAddExp(body);
  }

  return NextResponse.json(
    { error: "알 수 없는 action입니다" },
    { status: 400 }
  );
}

async function handleFeed(body: { user_id?: string }) {
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id가 필요합니다" },
      { status: 400 }
    );
  }

  // Mock 모드 (무제한 먹이)
  if (isUsingMockMode()) {
    mockSealFeeds.push({
      id: generateId(),
      user_id,
      fed_at: new Date().toISOString(),
    });

    const seal = getMockSeal();
    const newHp = Math.min(100, seal.hp + 3);
    const updated = updateMockSeal({ hp: newHp, last_fed: new Date().toISOString() });

    return NextResponse.json({
      ...updated,
      level: calculateLevel(updated.exp),
      fed: true,
    });
  }

  // Supabase 모드 (무제한 먹이)
  await supabase
    .from("seal_feeds")
    .insert({
      user_id,
      fed_at: new Date().toISOString(),
    });

  const { data: seal } = await supabase
    .from("seal")
    .select("*")
    .single();

  if (!seal) {
    return NextResponse.json(
      { error: "물개를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const newHp = Math.min(100, seal.hp + 3);
  const { data: updated, error: updateError } = await supabase
    .from("seal")
    .update({ hp: newHp, last_fed: new Date().toISOString() })
    .eq("id", seal.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...updated,
    level: calculateLevel(updated.exp),
    fed: true,
  });
}

async function handleAddExp(body: { amount?: number; reason?: string }) {
  const { amount, reason } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "유효한 amount가 필요합니다" },
      { status: 400 }
    );
  }

  // Mock 모드
  if (isUsingMockMode()) {
    const seal = getMockSeal();
    const newExp = seal.exp + amount;
    const newLevel = calculateLevel(newExp);
    const oldLevel = calculateLevel(seal.exp);
    const updated = updateMockSeal({ exp: newExp, level: newLevel });

    return NextResponse.json({
      ...updated,
      level: newLevel,
      leveled_up: newLevel > oldLevel,
      reason,
    });
  }

  // Supabase 모드
  const { data: seal } = await supabase
    .from("seal")
    .select("*")
    .single();

  if (!seal) {
    return NextResponse.json(
      { error: "물개를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const newExp = seal.exp + amount;
  const newLevel = calculateLevel(newExp);
  const oldLevel = calculateLevel(seal.exp);

  const { data: updated, error: updateError } = await supabase
    .from("seal")
    .update({ exp: newExp })
    .eq("id", seal.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...updated,
    level: newLevel,
    leveled_up: newLevel > oldLevel,
    reason,
  });
}
