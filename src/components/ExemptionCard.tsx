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
  const [flipped, setFlipped] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sparkle, setSparkle] = useState(false);

  const fetchExemptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/exemptions?user_id=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setExemptions(data.exemptions || []);
      }
    } catch {
      // 조회 실패
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
    setShowConfirm(false);

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
        setSparkle(true);
        setMessage("면제권을 사용했습니다! 오늘은 벌금 면제!");
        setTimeout(() => setSparkle(false), 2000);
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
    <div className="card space-y-4 relative overflow-hidden">
      <style>{exemptionStyles}</style>

      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
        <span>🎫</span>
        <span>면제권</span>
        {exemptions.length > 0 && (
          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
            {exemptions.length}장 보유
          </span>
        )}
      </h2>

      {loading ? (
        <p className="text-gray-400 text-center py-4 text-sm">로딩 중...</p>
      ) : exemptions.length === 0 ? (
        <div className="text-center py-6 space-y-2 bg-gray-50 rounded-xl">
          <p className="text-4xl opacity-30">🎫</p>
          <p className="text-gray-500 text-sm">사용 가능한 면제권이 없습니다</p>
          <p className="text-gray-400 text-xs">매주 월요일에 1장씩 자동 지급됩니다</p>
        </div>
      ) : (
        <>
          {/* 면제권 카드 (뒤집기 가능) */}
          <div
            className={`exemption-card-container ${flipped ? "flipped" : ""}`}
            onClick={() => !showConfirm && setFlipped(!flipped)}
          >
            <div className="exemption-card-inner">
              {/* 앞면: 면제권 이미지 */}
              <div className="exemption-card-front">
                <div className="relative">
                  <img
                    src="/mascot.jpg"
                    alt="면제권"
                    className="w-full h-44 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-xl" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="text-yellow-400 font-bold text-lg">죽기스 면제권</p>
                    <p className="text-zinc-300 text-xs">{exemptions[0].reason}</p>
                  </div>
                  {/* 홀로그램 효과 */}
                  <div className="exemption-hologram" />
                  {sparkle && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[...Array(6)].map((_, i) => (
                        <span
                          key={i}
                          className="exemption-sparkle"
                          style={{
                            left: `${15 + Math.random() * 70}%`,
                            top: `${10 + Math.random() * 70}%`,
                            animationDelay: `${i * 0.2}s`,
                          }}
                        >
                          ✨
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  탭하여 뒤집기
                </p>
              </div>

              {/* 뒷면: 정보 + 사용 버튼 */}
              <div className="exemption-card-back">
                <div className="space-y-3 p-4">
                  <div className="text-center">
                    <p className="text-3xl mb-1">🎫</p>
                    <p className="text-yellow-400 font-bold">면제권 상세</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">발급일</span>
                      <span className="text-zinc-200">
                        {new Date(exemptions[0].granted_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">사유</span>
                      <span className="text-zinc-200">{exemptions[0].reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">보유 수</span>
                      <span className="text-yellow-400 font-bold">{exemptions.length}장</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-700 pt-3">
                    <p className="text-xs text-zinc-500 mb-2">
                      사용하면 오늘의 벌금이 면제됩니다
                    </p>
                    <p className="text-xs text-zinc-600">매주 월요일에 1장 자동 지급</p>
                  </div>
                </div>
                <p className="text-center text-xs text-zinc-500 mt-1">
                  탭하여 앞면 보기
                </p>
              </div>
            </div>
          </div>

          {/* 사용 버튼 */}
          {hasCheckedInToday ? (
            <p className="text-gray-500 text-center text-sm py-1">
              이미 출석했으므로 면제권을 사용할 수 없습니다
            </p>
          ) : !showConfirm ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              disabled={!canUse}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200/50"
            >
              오늘 면제권 사용하기 🎫
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-amber-600 text-sm font-medium">
                정말 오늘 면제권을 사용할까요?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={useExemption}
                  disabled={using}
                  className="py-2.5 rounded-xl text-sm bg-amber-400 hover:bg-amber-500 text-white font-semibold"
                >
                  {using ? "사용 중..." : "사용하기"}
                </button>
              </div>
            </div>
          )}

          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("실패") || message.includes("오류")
                  ? "text-red-500"
                  : "text-green-500"
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

const exemptionStyles = `
  .exemption-card-container {
    perspective: 800px;
    cursor: pointer;
    min-height: 220px;
  }
  .exemption-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
  }
  .flipped .exemption-card-inner {
    transform: rotateY(180deg);
  }
  .exemption-card-front,
  .exemption-card-back {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 12px;
  }
  .exemption-card-front {
    position: relative;
  }
  .exemption-card-back {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: 12px;
  }

  /* 홀로그램 효과 */
  .exemption-hologram {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 12px;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(234, 179, 8, 0.08) 25%,
      transparent 50%,
      rgba(168, 85, 247, 0.08) 75%,
      transparent 100%
    );
    pointer-events: none;
    animation: hologram-shift 3s ease-in-out infinite;
  }
  @keyframes hologram-shift {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  /* 반짝이 */
  .exemption-sparkle {
    position: absolute;
    font-size: 20px;
    animation: exemption-pop 1.5s ease-out forwards;
    pointer-events: none;
  }
  @keyframes exemption-pop {
    0% { transform: scale(0); opacity: 0; }
    30% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0) translateY(-20px); opacity: 0; }
  }
`;
