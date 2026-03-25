"use client";

import { useEffect, useState } from "react";

type LeaderboardEntry = {
  id: string;
  name: string;
  totalPenalty: number;
};

export default function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [refreshKey]);

  const getRank = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
  };

  return (
    <div className="card">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
        <span>🏆</span>
        <span>리더보드</span>
        <span className="text-xs text-gray-400 font-normal ml-1 bg-gray-100 px-2 py-0.5 rounded-full">
          벌금 적은 순
        </span>
      </h2>

      {loading ? (
        <div className="space-y-1 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-5 bg-gray-200 rounded" />
                <div className="h-3.5 bg-gray-200 rounded w-16" />
              </div>
              <div className="h-3.5 bg-gray-200 rounded w-14" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-center py-4 text-sm">아직 참가자가 없습니다</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                i === 0
                  ? "bg-amber-50 border border-amber-200"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{getRank(i)}</span>
                <span className={`font-medium ${i === 0 ? "text-gray-900" : "text-gray-700"}`}>
                  {entry.name}
                </span>
              </div>
              <span
                className={`font-mono font-bold text-sm ${
                  entry.totalPenalty === 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {entry.totalPenalty === 0 ? "✨ 0원" : `${entry.totalPenalty.toLocaleString()}원`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
