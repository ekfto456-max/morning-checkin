"use client";

import { useState, useEffect } from "react";

type UserInfo = {
  id: string;
  name: string;
  batch?: string;
  purpose?: string;
  avatar_url?: string;
};

type Badge = { id: string; emoji: string; name: string; desc: string };

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

export default function UserProfileModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users?user_id=${userId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/stats?user_id=${userId}`).then((r) => r.ok ? r.json() : null),
    ]).then(([u, s]) => {
      setUser(u);
      setStats(s);
      setLoading(false);
    });
  }, [userId]);

  const statItems = stats ? [
    { icon: "✅", label: "정시 출석", value: `${stats.totalOnTime}회`, color: "text-green-600" },
    { icon: "⏰", label: "지각", value: `${stats.totalLate}회`, color: "text-red-500" },
    { icon: "📈", label: "출석률", value: `${stats.attendanceRate}%`, color: "text-blue-500" },
    { icon: "🔥", label: "최고 연속", value: `${stats.maxStreak}일`, color: "text-orange-500" },
    { icon: "⏱️", label: "평균 기상", value: stats.avgCheckinMinutes != null ? minutesToTimeStr(stats.avgCheckinMinutes) : "-", color: "text-purple-500" },
    { icon: "💸", label: "누적 벌금", value: stats.totalPenalty > 0 ? `₩${stats.totalPenalty.toLocaleString()}` : "0원", color: stats.totalPenalty > 0 ? "text-red-400" : "text-gray-400" },
  ] : [];

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-3">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">불러오는 중...</p>
            </div>
          ) : (
            <>
              {/* 프로필 헤더 */}
              <div className="flex items-center gap-4 mb-5">
                {user?.avatar_url && (user.avatar_url.startsWith("http") || user.avatar_url.startsWith("/")) ? (
                  <img
                    src={user.avatar_url}
                    alt={userName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600">
                    {user?.avatar_url || userName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold text-gray-900">{user?.name || userName}</p>
                  {user?.batch && <p className="text-sm text-gray-400">{user.batch}</p>}
                  {user?.purpose && (
                    <p className="text-xs text-gray-400 mt-0.5">🎯 {user.purpose}</p>
                  )}
                </div>
              </div>

              {/* 통계 */}
              {stats && (
                <>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">📊 통계</h4>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {statItems.map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">{item.icon} {item.label}</p>
                        <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* 뱃지 */}
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">🏅 뱃지</h4>
                  {stats.badges.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl py-4 text-center border border-gray-100">
                      <p className="text-xs text-gray-400">아직 획득한 뱃지가 없어요</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {stats.badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2"
                        >
                          <span className="text-xl">{badge.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 leading-tight">{badge.name}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">{badge.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
