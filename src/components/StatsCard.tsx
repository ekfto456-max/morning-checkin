"use client";

import { useState, useEffect } from "react";

type Badge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
};

type Stats = {
  totalOnTime: number;
  totalLate: number;
  totalPenalty: number;
  avgCheckinMinutes: number | null;
  attendanceRate: number;
  maxStreak: number;
  exemptionUsed: number;
  sealInteractions: number;
  badges: Badge[];
};

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${h12}:${m.toString().padStart(2, "0")}`;
}

export default function StatsCard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats?user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 나의 통계</h3>
        <p className="text-xs text-gray-400 text-center py-4">불러오는 중...</p>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      icon: "✅",
      label: "정시 출석",
      value: `${stats.totalOnTime}회`,
      color: "text-green-600",
    },
    {
      icon: "⏰",
      label: "지각",
      value: `${stats.totalLate}회`,
      color: "text-red-500",
    },
    {
      icon: "📈",
      label: "출석률",
      value: `${stats.attendanceRate}%`,
      color: "text-blue-500",
    },
    {
      icon: "🔥",
      label: "최고 연속",
      value: `${stats.maxStreak}일`,
      color: "text-orange-500",
    },
    {
      icon: "⏱️",
      label: "평균 기상",
      value: stats.avgCheckinMinutes != null
        ? minutesToTimeStr(stats.avgCheckinMinutes)
        : "데이터 없음",
      color: "text-purple-500",
    },
    {
      icon: "💸",
      label: "누적 벌금",
      value: stats.totalPenalty > 0
        ? `₩${stats.totalPenalty.toLocaleString()}`
        : "0원",
      color: stats.totalPenalty > 0 ? "text-red-400" : "text-gray-400",
    },
    {
      icon: "🎫",
      label: "면제권 사용",
      value: `${stats.exemptionUsed}회`,
      color: "text-amber-500",
    },
    {
      icon: "🦭",
      label: "뭉치 교감",
      value: `${stats.sealInteractions}번`,
      color: "text-teal-500",
    },
  ];

  return (
    <div className="space-y-3">
      {/* 통계 카드 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 나의 통계</h3>
        <div className="grid grid-cols-2 gap-2">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="bg-gray-50 rounded-xl p-3 border border-gray-100"
            >
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </p>
              <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 뱃지 카드 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏅 획득한 뱃지</h3>
        {stats.badges.length === 0 ? (
          <div className="bg-gray-50 rounded-xl py-6 text-center border border-gray-100">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-xs text-gray-400">아직 획득한 뱃지가 없어요</p>
            <p className="text-xs text-gray-300 mt-1">꾸준히 출석하면 뱃지를 얻을 수 있어요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2"
              >
                <span className="text-2xl leading-none">{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{badge.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 잠긴 뱃지 힌트 */}
        {stats.badges.length > 0 && stats.badges.length < 10 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              🔒 {10 - stats.badges.length}개의 뱃지를 더 획득할 수 있어요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
