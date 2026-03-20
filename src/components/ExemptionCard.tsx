"use client";

import { useState, useEffect, useCallback } from "react";

type Exemption = {
  id: string;
  user_id: string;
  reason: string;
  granted_at: string;
  used_at: string | null;
  used_for_date: string | null;
};

export default function ExemptionCard({
  userId,
  hasCheckedInToday,
  onExemptionUsed,
}: {
  userId: string;
  hasCheckedInToday: boolean;
  onExemptionUsed?: () => void;
}) {
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchExemptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/exemptions?user_id=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setExemptions(data.exemptions || []);
      }
    } catch {
      // 조회 실패 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchExemptions();
    }
  }, [userId, fetchExemptions]);

  const useExemption = async () => {
    if (exemptions.length === 0) return;
    setUsing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/exemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          exemption_id: exemptions[0].id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("면제권을 사용했습니다! 오늘은 벌금이 면제됩니다.");
        await fetchExemptions();
        onExemptionUsed?.();
      } else {
        setMessage(data.error || "면제권 사용에 실패했습니다");
      }
    } catch {
      setMessage("면제권 사용 중 오류가 발생했습니다");
    } finally {
      setUsing(false);
    }
  };

  const canUse = !hasCheckedInToday && exemptions.length > 0 && !using;

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>{"\uD83C\uDFAB"}</span>
        <span>{"면제권"}</span>
      </h2>

      {loading ? (
        <p className="text-zinc-500 text-center py-4">{"로딩 중..."}</p>
      ) : (
        <>
          {/* 보유 현황 */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">{"보유 면제권"}</span>
            <span
              className={`text-2xl font-bold ${
                exemptions.length > 0 ? "text-yellow-400" : "text-zinc-600"
              }`}
            >
              {exemptions.length}
              <span className="text-sm font-normal text-zinc-400 ml-1">
                {"장"}
              </span>
            </span>
          </div>

          {/* 면제권 목록 */}
          {exemptions.length > 0 && (
            <div className="space-y-2">
              {exemptions.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-zinc-800/50 rounded-lg px-3 py-2 text-sm flex items-center justify-between border border-zinc-700/50"
                >
                  <span className="text-zinc-300">{ex.reason}</span>
                  <span className="text-zinc-500 text-xs">
                    {new Date(ex.granted_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 사용 버튼 */}
          {hasCheckedInToday ? (
            <p className="text-zinc-500 text-center text-sm py-2">
              {"이미 출석했으므로 면제권을 사용할 수 없습니다"}
            </p>
          ) : exemptions.length === 0 ? (
            <p className="text-zinc-600 text-center text-sm py-2">
              {"사용 가능한 면제권이 없습니다"}
            </p>
          ) : (
            <button
              onClick={useExemption}
              disabled={!canUse}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {using ? "사용 중..." : "오늘 면제권 사용하기"}
            </button>
          )}

          {/* 메시지 */}
          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("실패") || message.includes("오류")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
