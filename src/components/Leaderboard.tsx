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
    if (index === 0) return "\uD83E\uDD47";
    if (index === 1) return "\uD83E\uDD48";
    if (index === 2) return "\uD83E\uDD49";
    return `${index + 1}.`;
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>{"\uD83C\uDFC6"}</span>
        <span>{"\uB9AC\uB354\uBCF4\uB4DC"}</span>
        <span className="text-xs text-zinc-500 font-normal ml-1">
          {"\uBC8C\uAE08 \uC801\uC740 \uC21C"}
        </span>
      </h2>

      {loading ? (
        <p className="text-zinc-600 text-center py-4">
          {"\uB85C\uB529 \uC911..."}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-zinc-600 text-center py-4">
          {"\uC544\uC9C1 \uCC38\uAC00\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"}
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${
                i === 0
                  ? "bg-yellow-900/20 border border-yellow-800/30"
                  : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{getRank(i)}</span>
                <span className="font-medium">{entry.name}</span>
              </div>
              <span
                className={`font-mono font-bold ${
                  entry.totalPenalty === 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {entry.totalPenalty.toLocaleString()}
                {"\uC6D0"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
