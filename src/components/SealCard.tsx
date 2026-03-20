"use client";

import { useState, useEffect, useCallback } from "react";

const LEVEL_THRESHOLDS = [
  { level: 1, exp: 0, next: 100 },
  { level: 2, exp: 100, next: 300 },
  { level: 3, exp: 300, next: 600 },
  { level: 4, exp: 600, next: 1000 },
  { level: 5, exp: 1000, next: Infinity },
];

const LEVEL_NAMES: Record<number, string> = {
  1: "아기 물개 🥒",
  2: "꼬마 물개 🧒",
  3: "청소년 물개 🦭",
  4: "어른 물개 💪",
  5: "전설의 물개 👑",
};

const HAPPY_MESSAGES = [
  "오늘도 화이팅!",
  "물고기 맛있다~",
  "다들 사랑해 🦭",
  "일찍 와줘서 고마워~",
  "오늘 하루도 즐겁다! 🐟",
];
const NORMAL_MESSAGES = [
  "배고프다...",
  "오늘도 힘내자!",
  "물고기 주세요~",
  "오늘도 다들 일찍 와줘서 고마워~ 🐟",
];
const SAD_MESSAGES = [
  "아무도 안 와...",
  "배고파서 힘이 없어...",
  "물개 슬프다...",
  "누가 밥 좀...",
];

type SealStatus = "happy" | "normal" | "sad" | "very_sad";

interface SealData {
  id: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  accessories: string[];
  last_fed: string | null;
}

function getSealStatus(hp: number): SealStatus {
  if (hp > 80) return "happy";
  if (hp >= 50) return "normal";
  if (hp >= 20) return "sad";
  return "very_sad";
}

function getRandomMessage(status: SealStatus): string {
  const messages =
    status === "happy"
      ? HAPPY_MESSAGES
      : status === "normal"
        ? NORMAL_MESSAGES
        : SAD_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}

function getLevelInfo(level: number, exp: number) {
  const current = LEVEL_THRESHOLDS.find((t) => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextExp = current.next;
  const currentExp = exp - current.exp;
  const needed = nextExp - current.exp;
  return { currentExp, needed, nextExp };
}

export default function SealCard({ userId }: { userId: string }) {
  const [seal, setSeal] = useState<SealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeding, setFeeding] = useState(false);
  const [fedToday, setFedToday] = useState(false);
  const [showFeedAnimation, setShowFeedAnimation] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSeal = useCallback(async () => {
    try {
      const res = await fetch("/api/seal");
      if (res.ok) {
        const data = await res.json();
        setSeal(data);
        setMessage(getRandomMessage(getSealStatus(data.hp)));
      }
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeal();
  }, [fetchSeal]);

  // 메시지 주기적 변경
  useEffect(() => {
    if (!seal) return;
    const interval = setInterval(() => {
      setMessage(getRandomMessage(getSealStatus(seal.hp)));
    }, 8000);
    return () => clearInterval(interval);
  }, [seal]);

  const handleFeed = async () => {
    if (feeding || fedToday || !seal) return;
    setFeeding(true);
    setShowFeedAnimation(true);

    // 물고기 날아가는 애니메이션 대기
    await new Promise((r) => setTimeout(r, 800));
    setShowFeedAnimation(false);

    try {
      const res = await fetch("/api/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feed", user_id: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSeal(data);
        setFedToday(true);
        setShowSparkle(true);
        setMessage("물고기 맛있다~ 고마워! 🐟");
        setTimeout(() => setShowSparkle(false), 2000);
      } else if (res.status === 409) {
        setFedToday(true);
      }
    } catch {
      // 에러 무시
    } finally {
      setFeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <div className="text-zinc-500 animate-pulse">물개를 불러오는 중...</div>
      </div>
    );
  }

  if (!seal) {
    return (
      <div className="card flex items-center justify-center py-12">
        <div className="text-zinc-500">물개를 찾을 수 없습니다</div>
      </div>
    );
  }

  const status = getSealStatus(seal.hp);
  const levelInfo = getLevelInfo(seal.level, seal.exp);
  const hpPercent = Math.min(100, Math.max(0, seal.hp));
  const expPercent =
    seal.level >= 5
      ? 100
      : Math.min(100, (levelInfo.currentExp / levelInfo.needed) * 100);

  return (
    <div className="card space-y-4 relative overflow-hidden">
      <style>{sealStyles}</style>

      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>🦭</span>
        <span>우리의 물개</span>
      </h2>

      {/* 물개 캐릭터 영역 */}
      <div className="flex flex-col items-center py-4 relative">
        {/* 먹이주기 물고기 애니메이션 */}
        {showFeedAnimation && (
          <div className="fish-fly">🐟</div>
        )}

        {/* 반짝이 효과 */}
        {showSparkle && (
          <div className="sparkle-container">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="sparkle" style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 60}%`,
                animationDelay: `${i * 0.15}s`,
              }}>✨</div>
            ))}
          </div>
        )}

        {/* 물개 본체 */}
        <div className={`seal-character ${showSparkle ? "seal-bounce" : ""}`}>
          {/* 몸통 */}
          <div className="seal-body">
            {/* 얼굴 */}
            <div className="seal-face">
              {/* 눈 */}
              <div className="seal-eyes">
                <div className={`seal-eye seal-eye-left ${status === "happy" ? "eye-happy" : status === "sad" || status === "very_sad" ? "eye-sad" : ""}`}>
                  <div className="eye-shine"></div>
                  <div className="eye-shine-small"></div>
                  {status === "very_sad" && <div className="tear tear-left"></div>}
                </div>
                <div className={`seal-eye seal-eye-right ${status === "happy" ? "eye-happy" : status === "sad" || status === "very_sad" ? "eye-sad" : ""}`}>
                  <div className="eye-shine"></div>
                  <div className="eye-shine-small"></div>
                  {status === "very_sad" && <div className="tear tear-right"></div>}
                </div>
              </div>
              {/* 코 */}
              <div className="seal-nose"></div>
              {/* 입 */}
              <div className={`seal-mouth ${status === "happy" ? "mouth-happy" : status === "sad" || status === "very_sad" ? "mouth-sad" : ""}`}></div>
              {/* 수염 */}
              <div className="seal-whiskers">
                <div className="whisker whisker-left-top"></div>
                <div className="whisker whisker-left-bottom"></div>
                <div className="whisker whisker-right-top"></div>
                <div className="whisker whisker-right-bottom"></div>
              </div>
              {/* 볼 터치 (행복할 때) */}
              {status === "happy" && (
                <>
                  <div className="seal-blush seal-blush-left"></div>
                  <div className="seal-blush seal-blush-right"></div>
                </>
              )}
            </div>
            {/* 지느러미 */}
            <div className="seal-flipper seal-flipper-left"></div>
            <div className="seal-flipper seal-flipper-right"></div>
            {/* 꼬리 */}
            <div className="seal-tail"></div>
          </div>
        </div>

        {/* 이름 & 레벨 */}
        <div className="mt-3 text-center">
          <p className="text-lg font-bold text-zinc-100">
            &quot;{seal.name}&quot;
          </p>
          <p className="text-sm text-zinc-400">
            Lv.{seal.level} {LEVEL_NAMES[seal.level] || LEVEL_NAMES[1]}
          </p>
        </div>
      </div>

      {/* HP 바 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm w-6">❤️</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden border border-zinc-700">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50
                  ? "linear-gradient(90deg, #ef4444, #f87171)"
                  : hpPercent > 20
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, #dc2626, #991b1b)",
              }}
            />
          </div>
          <span className="text-sm text-zinc-400 font-mono w-16 text-right">
            {seal.hp}/100
          </span>
        </div>

        {/* EXP 바 */}
        <div className="flex items-center gap-2">
          <span className="text-sm w-6">⭐</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden border border-zinc-700">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${expPercent}%`,
                background: "linear-gradient(90deg, #eab308, #facc15)",
              }}
            />
          </div>
          <span className="text-sm text-zinc-400 font-mono w-16 text-right">
            {seal.exp}/{seal.level >= 5 ? "MAX" : levelInfo.needed + LEVEL_THRESHOLDS[seal.level - 1].exp}
          </span>
        </div>
      </div>

      {/* 말풍선 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 text-center relative">
        <div className="speech-triangle"></div>
        <p className="text-sm text-zinc-300 italic">
          &quot;{message}&quot;
        </p>
      </div>

      {/* 먹이주기 버튼 */}
      <div className="text-center space-y-2">
        <button
          onClick={handleFeed}
          disabled={fedToday || feeding}
          className={`px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
            fedToday
              ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-800/40"
          }`}
        >
          {feeding ? "먹이 주는 중..." : fedToday ? "오늘 먹이 줌 ✅" : "🐟 먹이주기"}
        </button>
        <p className="text-xs text-zinc-500">
          {fedToday ? "내일 다시 먹이를 줄 수 있어요" : "하루에 한 번 먹이를 줄 수 있어요"}
        </p>
      </div>
    </div>
  );
}

const sealStyles = `
  /* 물개 캐릭터 컨테이너 */
  .seal-character {
    animation: seal-float 3s ease-in-out infinite;
    position: relative;
    width: 160px;
    height: 140px;
  }

  /* 떠다니는 애니메이션 */
  @keyframes seal-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  /* 행복 바운스 */
  .seal-bounce {
    animation: seal-happy-bounce 0.5s ease-in-out 3 !important;
  }
  @keyframes seal-happy-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-16px) scale(1.05); }
    60% { transform: translateY(-4px) scale(0.98); }
  }

  /* 몸통 */
  .seal-body {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 90px;
    background: linear-gradient(180deg, #9ca3af 0%, #d1d5db 40%, #e5e7eb 100%);
    border-radius: 55% 55% 50% 50% / 60% 60% 45% 45%;
    box-shadow: inset 0 -8px 16px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.3);
    position: relative;
  }

  /* 배 부분 (밝은 색) */
  .seal-body::after {
    content: '';
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 50px;
    background: linear-gradient(180deg, #e5e7eb 0%, #f3f4f6 100%);
    border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
  }

  /* 얼굴 */
  .seal-face {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    height: 60px;
    z-index: 2;
  }

  /* 눈 컨테이너 */
  .seal-eyes {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 8px;
  }

  /* 눈 */
  .seal-eye {
    width: 22px;
    height: 22px;
    background: #1a1a2e;
    border-radius: 50%;
    position: relative;
    animation: seal-blink 4s ease-in-out infinite;
  }
  .seal-eye-left { animation-delay: 0s; }
  .seal-eye-right { animation-delay: 0.05s; }

  /* 눈 깜빡임 */
  @keyframes seal-blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  /* 눈 반짝임 */
  .eye-shine {
    position: absolute;
    top: 3px;
    left: 4px;
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
  }
  .eye-shine-small {
    position: absolute;
    bottom: 4px;
    right: 3px;
    width: 4px;
    height: 4px;
    background: rgba(255,255,255,0.7);
    border-radius: 50%;
  }

  /* 행복한 눈 (웃는 눈) */
  .eye-happy {
    height: 12px;
    border-radius: 12px 12px 0 0;
    background: #1a1a2e;
    animation: none;
  }
  .eye-happy .eye-shine,
  .eye-happy .eye-shine-small {
    display: none;
  }

  /* 슬픈 눈 */
  .eye-sad {
    transform: scaleY(0.8);
  }
  .eye-sad::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -2px;
    width: 26px;
    height: 8px;
    border-bottom: 2px solid #6b7280;
    border-radius: 0 0 50% 50%;
    transform: rotate(-5deg);
  }

  /* 눈물 */
  .tear {
    position: absolute;
    bottom: -12px;
    width: 6px;
    height: 10px;
    background: #60a5fa;
    border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
    animation: tear-fall 1.5s ease-in infinite;
    opacity: 0.8;
  }
  .tear-left { left: 4px; animation-delay: 0s; }
  .tear-right { right: 4px; animation-delay: 0.7s; }

  @keyframes tear-fall {
    0% { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(20px); opacity: 0; }
  }

  /* 코 */
  .seal-nose {
    width: 12px;
    height: 8px;
    background: #374151;
    border-radius: 50%;
    margin: 4px auto 0;
  }

  /* 입 */
  .seal-mouth {
    width: 16px;
    height: 6px;
    border-bottom: 2px solid #4b5563;
    border-radius: 0 0 50% 50%;
    margin: 1px auto 0;
  }
  .mouth-happy {
    width: 20px;
    height: 8px;
    border-bottom: 2.5px solid #4b5563;
    border-radius: 0 0 50% 50%;
  }
  .mouth-sad {
    border-bottom: none;
    border-top: 2px solid #4b5563;
    border-radius: 50% 50% 0 0;
  }

  /* 수염 */
  .seal-whiskers {
    position: absolute;
    top: 34px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
  }
  .whisker {
    position: absolute;
    height: 1.5px;
    width: 22px;
    background: #9ca3af;
    border-radius: 1px;
  }
  .whisker-left-top { left: 6px; top: 0; transform: rotate(-8deg); }
  .whisker-left-bottom { left: 8px; top: 6px; transform: rotate(8deg); }
  .whisker-right-top { right: 6px; top: 0; transform: rotate(8deg); }
  .whisker-right-bottom { right: 8px; top: 6px; transform: rotate(-8deg); }

  /* 볼 터치 */
  .seal-blush {
    position: absolute;
    width: 14px;
    height: 8px;
    background: rgba(251, 113, 133, 0.35);
    border-radius: 50%;
    top: 30px;
  }
  .seal-blush-left { left: 14px; }
  .seal-blush-right { right: 14px; }

  /* 지느러미 */
  .seal-flipper {
    position: absolute;
    width: 28px;
    height: 18px;
    background: linear-gradient(180deg, #9ca3af, #b0b7c3);
    border-radius: 60% 60% 50% 50%;
    top: 50px;
    z-index: 1;
    animation: flipper-wave 2s ease-in-out infinite;
  }
  .seal-flipper-left {
    left: -10px;
    transform: rotate(25deg);
    transform-origin: right center;
    animation-delay: 0s;
  }
  .seal-flipper-right {
    right: -10px;
    transform: rotate(-25deg);
    transform-origin: left center;
    animation-delay: 0.3s;
  }

  @keyframes flipper-wave {
    0%, 100% { transform: rotate(25deg); }
    50% { transform: rotate(15deg); }
  }
  .seal-flipper-right {
    animation-name: flipper-wave-right;
  }
  @keyframes flipper-wave-right {
    0%, 100% { transform: rotate(-25deg); }
    50% { transform: rotate(-15deg); }
  }

  /* 꼬리 */
  .seal-tail {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 14px;
    z-index: 0;
  }
  .seal-tail::before,
  .seal-tail::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 16px;
    height: 12px;
    background: #9ca3af;
    border-radius: 50% 50% 50% 50%;
  }
  .seal-tail::before {
    left: 0;
    transform: rotate(-15deg);
  }
  .seal-tail::after {
    right: 0;
    transform: rotate(15deg);
  }

  /* 물고기 날아가기 애니메이션 */
  .fish-fly {
    position: absolute;
    font-size: 28px;
    z-index: 10;
    animation: fish-to-seal 0.8s ease-in forwards;
    pointer-events: none;
  }
  @keyframes fish-to-seal {
    0% {
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%) rotate(0deg) scale(1);
      opacity: 1;
    }
    70% {
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%) rotate(-20deg) scale(0.8);
      opacity: 1;
    }
    100% {
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) rotate(-30deg) scale(0.3);
      opacity: 0;
    }
  }

  /* 반짝이 효과 */
  .sparkle-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }
  .sparkle {
    position: absolute;
    font-size: 18px;
    animation: sparkle-pop 1.5s ease-out forwards;
  }
  @keyframes sparkle-pop {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    30% { transform: scale(1.2) rotate(90deg); opacity: 1; }
    100% { transform: scale(0) rotate(180deg) translateY(-30px); opacity: 0; }
  }

  /* 말풍선 삼각형 */
  .speech-triangle {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid rgba(63, 63, 70, 0.6);
  }
`;
