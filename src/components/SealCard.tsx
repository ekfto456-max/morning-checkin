"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const LEVEL_THRESHOLDS = [
  { level: 1, exp: 0, next: 100 },
  { level: 2, exp: 100, next: 300 },
  { level: 3, exp: 300, next: 600 },
  { level: 4, exp: 600, next: 1000 },
  { level: 5, exp: 1000, next: Infinity },
];

const LEVEL_NAMES: Record<number, string> = {
  1: "아기 물개 🥚",
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
  "헤헤 기분 좋다~",
  "같이 놀자! 🎾",
];
const NORMAL_MESSAGES = [
  "배고프다...",
  "오늘도 힘내자!",
  "물고기 주세요~",
  "같이 놀아줘~",
  "심심해... 🦭",
];
const SAD_MESSAGES = [
  "아무도 안 와...",
  "배고파서 힘이 없어...",
  "물개 슬프다...",
  "누가 밥 좀...",
  "외로워... 😢",
];

const PET_REACTIONS = [
  "으흐흐~ 간지러워!",
  "더 쓰다듬어줘~",
  "기분 좋다 헤헤",
  "좋아좋아! 🥰",
  "꾸벅... 잠올것 같아~",
  "부드럽게 만져줘서 고마워!",
];

const PLAY_REACTIONS = [
  "와! 공이다! 🎾",
  "받아라~ 퐁!",
  "한 번 더! 한 번 더!",
  "물개도 운동 좋아해!",
  "같이 놀아서 재밌다~",
  "하하 잡았다! 🦭",
];

const TRICK_REACTIONS = [
  "짜잔~ 박수! 👏",
  "물개 돌기~ 빙글빙글!",
  "공 위에 올라가기! 🎪",
  "물개 점프! 🦭💨",
  "와 나 천재 아닌가?",
];

type SealStatus = "happy" | "normal" | "sad" | "very_sad";

interface SealData {
  id: string;
  name: string;
  level: number;
  exp: number;
  accessories: string[];
  last_fed: string | null;
}

// HP 대신 last_fed 기준으로 기분 결정
function getSealStatus(lastFed: string | null): SealStatus {
  if (!lastFed) return "very_sad";
  const hours = (Date.now() - new Date(lastFed).getTime()) / (1000 * 60 * 60);
  if (hours < 2) return "happy";
  if (hours < 6) return "normal";
  if (hours < 24) return "sad";
  return "very_sad";
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLevelInfo(level: number, exp: number) {
  const current = LEVEL_THRESHOLDS.find((t) => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextExp = current.next;
  const currentExp = exp - current.exp;
  const needed = nextExp - current.exp;
  return { currentExp, needed, nextExp };
}

type IdleBehavior = "scratch" | "yawn" | "stretch" | "wiggle" | "look-around" | "sneeze" | "roll-over" | "shake-water" | null;

export default function SealCard({ userId }: { userId: string }) {
  const [seal, setSeal] = useState<SealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeding, setFeeding] = useState(false);
  const [showFeedAnimation, setShowFeedAnimation] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [message, setMessage] = useState("");
  const [actionCooldown, setActionCooldown] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string>("");
  const [fishCount, setFishCount] = useState(0);
  const [showHearts, setShowHearts] = useState(false);
  const [showBall, setShowBall] = useState(false);
  const [showTrick, setShowTrick] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Autonomous behavior states
  const [positionX, setPositionX] = useState(0);
  const [idleBehavior, setIdleBehavior] = useState<IdleBehavior>(null);
  const [eyeDirection, setEyeDirection] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [leftFlipperWave, setLeftFlipperWave] = useState(false);
  const [rightFlipperWave, setRightFlipperWave] = useState(false);
  const [tapReaction, setTapReaction] = useState(false);
  const [tapEmoji, setTapEmoji] = useState("");
  const [tapPos, setTapPos] = useState({ x: 0, y: 0 });

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSeal = useCallback(async () => {
    try {
      const res = await fetch("/api/seal");
      if (res.ok) {
        const data = await res.json();
        setSeal(data);
        setMessage(getRandomItem(
          getSealStatus(data.last_fed) === "happy" ? HAPPY_MESSAGES :
          getSealStatus(data.last_fed) === "normal" ? NORMAL_MESSAGES : SAD_MESSAGES
        ));
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
      const status = getSealStatus(seal.last_fed);
      setMessage(getRandomItem(
        status === "happy" ? HAPPY_MESSAGES :
        status === "normal" ? NORMAL_MESSAGES : SAD_MESSAGES
      ));
    }, 8000);
    return () => clearInterval(interval);
  }, [seal]);

  // Autonomous movement - randomly slide left/right
  useEffect(() => {
    const scheduleMove = () => {
      const delay = 3000 + Math.random() * 5000;
      moveTimeoutRef.current = setTimeout(() => {
        if (!currentAnimation) {
          const newX = -60 + Math.random() * 120;
          setPositionX(newX);
        }
        scheduleMove();
      }, delay);
    };
    scheduleMove();
    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    };
  }, [currentAnimation]);

  // Random idle behaviors
  useEffect(() => {
    const behaviors: IdleBehavior[] = ["scratch", "yawn", "stretch", "wiggle", "look-around", "sneeze", "roll-over", "shake-water"];
    const scheduleIdle = () => {
      const delay = 4000 + Math.random() * 8000;
      idleTimeoutRef.current = setTimeout(() => {
        if (!currentAnimation && !idleBehavior) {
          const behavior = getRandomItem(behaviors);
          setIdleBehavior(behavior);
          const duration = behavior === "roll-over" ? 2000 : behavior === "shake-water" ? 1800 : 1500;
          setTimeout(() => setIdleBehavior(null), duration);
        }
        scheduleIdle();
      }, delay);
    };
    scheduleIdle();
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [currentAnimation, idleBehavior]);

  // Natural eye blinking
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
  }, []);

  // Random eye direction
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        setEyeDirection({
          x: -3 + Math.random() * 6,
          y: -2 + Math.random() * 4,
        });
      } else {
        setEyeDirection({ x: 0, y: 0 });
      }
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Independent flipper waves
  useEffect(() => {
    const leftInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setLeftFlipperWave(true);
        setTimeout(() => setLeftFlipperWave(false), 800);
      }
    }, 3000 + Math.random() * 2000);

    const rightInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setRightFlipperWave(true);
        setTimeout(() => setRightFlipperWave(false), 800);
      }
    }, 3500 + Math.random() * 2000);

    return () => {
      clearInterval(leftInterval);
      clearInterval(rightInterval);
    };
  }, []);

  const startCooldown = () => {
    setActionCooldown(true);
    setTimeout(() => setActionCooldown(false), 1500);
  };

  // Tap/click on seal
  const handleSealTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tapReaction) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTapPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const emojis = ["💕", "🦭", "✨", "💫", "🫧", "🐟", "❣️", "🥰"];
    setTapEmoji(getRandomItem(emojis));
    setTapReaction(true);
    setTimeout(() => setTapReaction(false), 800);
  };

  // 먹이주기 (무제한)
  const handleFeed = async () => {
    if (feeding || actionCooldown || !seal) return;
    setFeeding(true);
    setShowFeedAnimation(true);
    startCooldown();

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
        setFishCount((c) => c + 1);
        setShowSparkle(true);
        setMessage("물고기 맛있다~ 고마워! 🐟");
        setTimeout(() => setShowSparkle(false), 2000);
      }
    } catch {
      // 에러 무시
    } finally {
      setFeeding(false);
    }
  };

  // 쓰다듬기
  const handlePet = () => {
    if (actionCooldown || !seal) return;
    startCooldown();
    setShowHearts(true);
    setCurrentAnimation("seal-pet");
    setMessage(getRandomItem(PET_REACTIONS));
    setTimeout(() => {
      setShowHearts(false);
      setCurrentAnimation("");
    }, 1500);
  };

  // 공놀이
  const handlePlay = () => {
    if (actionCooldown || !seal) return;
    startCooldown();
    setShowBall(true);
    setCurrentAnimation("seal-play");
    setMessage(getRandomItem(PLAY_REACTIONS));
    setTimeout(() => {
      setShowBall(false);
      setCurrentAnimation("");
    }, 2000);
  };

  // 재주 부리기
  const handleTrick = () => {
    if (actionCooldown || !seal) return;
    startCooldown();
    setShowTrick(true);
    setCurrentAnimation("seal-trick");
    setMessage(getRandomItem(TRICK_REACTIONS));
    setTimeout(() => {
      setShowTrick(false);
      setCurrentAnimation("");
    }, 2500);
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

  const status = getSealStatus(seal.last_fed);
  const levelInfo = getLevelInfo(seal.level, seal.exp);
  const expPercent =
    seal.level >= 5
      ? 100
      : Math.min(100, (levelInfo.currentExp / levelInfo.needed) * 100);

  const idleClass = idleBehavior ? `idle-${idleBehavior}` : "";
  const activeAnim = currentAnimation || (showSparkle ? "seal-bounce" : "");

  return (
    <div className="card space-y-4 relative overflow-hidden">
      <style>{sealStyles}</style>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🦭</span>
          <span>우리의 물개</span>
          {fishCount > 0 && (
            <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">
              오늘 🐟 x{fishCount}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowGuide(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-all"
        >
          🐾 키우는 법
        </button>
      </div>

      {/* 물개 키우는 법 모달 */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowGuide(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-t-3xl p-6 pb-10 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>🦭</span> 물개 키우는 법
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-zinc-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-all"
              >✕</button>
            </div>

            {/* EXP 획득 방법 */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>⭐</span> EXP 획득 방법
              </p>
              <div className="space-y-1.5">
                {[
                  { icon: "✅", label: "정시 출석 (10:04 이전)", exp: "+10 EXP", color: "text-green-400" },
                  { icon: "🌅", label: "새벽 기상 보너스 (오전 7시 이전)", exp: "+20 EXP", color: "text-blue-400" },
                  { icon: "⚡", label: "전원 정시 출석 (팀 보너스)", exp: "+30 EXP", color: "text-yellow-400" },
                  { icon: "🔥", label: "연속 출석 5일 이상", exp: "+5 EXP", color: "text-orange-400" },
                  { icon: "❌", label: "지각 출석", exp: "-10 EXP", color: "text-red-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-zinc-300 flex items-center gap-2">
                      <span>{item.icon}</span>{item.label}
                    </span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.exp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 성장 단계 */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>🌱</span> 성장 단계
              </p>
              <div className="space-y-1.5">
                {[
                  { level: 1, name: "아기 물개 🥚", range: "0 ~ 99 EXP" },
                  { level: 2, name: "꼬마 물개 🧒", range: "100 ~ 299 EXP" },
                  { level: 3, name: "청소년 물개 🦭", range: "300 ~ 599 EXP" },
                  { level: 4, name: "어른 물개 💪", range: "600 ~ 999 EXP" },
                  { level: 5, name: "전설의 물개 👑", range: "1000 EXP~" },
                ].map((s) => (
                  <div key={s.level} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${seal?.level === s.level ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-zinc-800/40"}`}>
                    <span className="text-sm text-zinc-200 flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-mono w-6">Lv{s.level}</span>
                      {s.name}
                      {seal?.level === s.level && <span className="text-xs text-yellow-400">← 현재</span>}
                    </span>
                    <span className="text-xs text-zinc-500">{s.range}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 인터랙션 설명 */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>🎮</span> 물개와 놀기
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🐟", name: "먹이", desc: "하루 무제한 줄 수 있어요" },
                  { icon: "🤚", name: "쓰다듬기", desc: "물개가 행복해해요" },
                  { icon: "🎾", name: "공놀이", desc: "같이 공을 던져요" },
                  { icon: "🎪", name: "재주", desc: "빙글빙글 돌아요" },
                ].map((action) => (
                  <div key={action.name} className="bg-zinc-800/60 rounded-xl p-3 space-y-0.5">
                    <p className="text-sm font-medium text-zinc-200">{action.icon} {action.name}</p>
                    <p className="text-xs text-zinc-500">{action.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 text-center pt-1">물개 몸을 직접 탭해도 반응해요 👆</p>
            </div>

            {/* ❤️ HP */}
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><span>❤️</span> 체력 (HP)</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                물개 체력은 매일 조금씩 줄어들어요. 출석하거나 먹이·놀이를 해주면 체력이 유지돼요.<br/>
                체력이 낮아지면 물개가 슬퍼하고 눈물을 흘려요 😢
              </p>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 물개 캐릭터 영역 */}
      <div className="seal-stage" onClick={handleSealTap}>
        {/* 먹이주기 물고기 애니메이션 */}
        {showFeedAnimation && <div className="fish-fly">🐟</div>}

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

        {/* 하트 효과 (쓰다듬기) */}
        {showHearts && (
          <div className="sparkle-container">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="heart-float" style={{
                left: `${25 + Math.random() * 50}%`,
                animationDelay: `${i * 0.2}s`,
              }}>❤️</div>
            ))}
          </div>
        )}

        {/* 공 애니메이션 */}
        {showBall && <div className="ball-bounce">🎾</div>}

        {/* 재주 효과 */}
        {showTrick && (
          <div className="sparkle-container">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="sparkle" style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${5 + Math.random() * 50}%`,
                animationDelay: `${i * 0.15}s`,
              }}>⭐</div>
            ))}
          </div>
        )}

        {/* Tap reaction emoji */}
        {tapReaction && (
          <div
            className="tap-emoji"
            style={{ left: tapPos.x, top: tapPos.y }}
          >
            {tapEmoji}
          </div>
        )}

        {/* 물개 본체 - autonomous movement wrapper */}
        <div
          className="seal-mover"
          style={{ transform: `translateX(${positionX}px)` }}
        >
          <div className={`seal-character ${activeAnim} ${idleClass} ${tapReaction ? "seal-tap-jiggle" : ""}`}>
            {/* Shadow beneath seal */}
            <div className="seal-shadow"></div>

            {/* 실제 물개 사진 */}
            <div className="seal-body seal-breathing">
              {/* Lv5 왕관 파티클 */}
              {seal.level === 5 && (
                <>
                  <div className="lv5-sparkle sp1">✨</div>
                  <div className="lv5-sparkle sp2">⭐</div>
                  <div className="lv5-sparkle sp3">✨</div>
                </>
              )}
              <img
                src={`/seals/seal-${seal.level}.${seal.level === 2 ? "webp" : "jpg"}`}
                alt={LEVEL_NAMES[seal.level]}
                className={`seal-photo ${status === "very_sad" ? "seal-photo-sad" : ""} ${status === "happy" ? "seal-photo-happy" : ""}`}
                draggable={false}
              />
              {/* 슬플 때 눈물 오버레이 */}
              {status === "very_sad" && (
                <div className="tear-overlay">
                  <div className="tear tear-left"></div>
                  <div className="tear tear-right"></div>
                </div>
              )}
              {/* 행복할 때 하트 */}
              {status === "happy" && (
                <div className="happy-overlay">
                  <div className="happy-blush bl"></div>
                  <div className="happy-blush br"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 이름 & 레벨 */}
        <div className="mt-3 text-center relative z-10">
          <p className="text-lg font-bold text-zinc-100">
            &quot;{seal.name}&quot;
          </p>
          <p className="text-sm text-zinc-400">
            Lv.{seal.level} {LEVEL_NAMES[seal.level] || LEVEL_NAMES[1]}
          </p>
        </div>
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
        <span className="text-sm text-zinc-400 font-mono w-20 text-right">
          {seal.exp.toFixed(1)}/{seal.level >= 5 ? "MAX" : levelInfo.needed + LEVEL_THRESHOLDS[seal.level - 1].exp}
        </span>
      </div>

      {/* 말풍선 */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 text-center relative">
        <div className="speech-triangle"></div>
        <p className="text-sm text-zinc-300 italic">
          &quot;{message}&quot;
        </p>
      </div>

      {/* 인터랙션 버튼들 */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleFeed}
          disabled={feeding || actionCooldown}
          className="interaction-btn"
        >
          <span className="text-xl">🐟</span>
          <span className="text-xs text-zinc-400">먹이</span>
        </button>
        <button
          onClick={handlePet}
          disabled={actionCooldown}
          className="interaction-btn"
        >
          <span className="text-xl">🤚</span>
          <span className="text-xs text-zinc-400">쓰다듬기</span>
        </button>
        <button
          onClick={handlePlay}
          disabled={actionCooldown}
          className="interaction-btn"
        >
          <span className="text-xl">🎾</span>
          <span className="text-xs text-zinc-400">공놀이</span>
        </button>
        <button
          onClick={handleTrick}
          disabled={actionCooldown}
          className="interaction-btn"
        >
          <span className="text-xl">🎪</span>
          <span className="text-xs text-zinc-400">재주</span>
        </button>
      </div>

      <p className="text-center text-xs text-zinc-600">
        물개와 놀아주면 체력이 유지돼요! 출석하면 EXP를 얻어요
      </p>
    </div>
  );
}

const sealStyles = `
  /* 인터랙션 버튼 */
  .interaction-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px;
    background: rgba(39, 39, 42, 0.6);
    border: 1px solid rgba(63, 63, 70, 0.5);
    border-radius: 12px;
    transition: all 0.2s;
  }
  .interaction-btn:hover:not(:disabled) {
    background: rgba(63, 63, 70, 0.8);
    transform: scale(1.05);
  }
  .interaction-btn:active:not(:disabled) {
    transform: scale(0.95);
  }
  .interaction-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* 물개 스테이지 */
  .seal-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0;
    position: relative;
    min-height: 200px;
    cursor: pointer;
    overflow: hidden;
  }

  /* Autonomous movement wrapper */
  .seal-mover {
    transition: transform 2.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    position: relative;
  }

  /* 물개 캐릭터 컨테이너 */
  .seal-character {
    animation: seal-float 3s ease-in-out infinite;
    position: relative;
    width: 180px;
    height: 160px;
  }

  /* Shadow under the seal */
  .seal-shadow {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 16px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%);
    border-radius: 50%;
    animation: shadow-pulse 3s ease-in-out infinite;
  }
  @keyframes shadow-pulse {
    0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; }
    50% { transform: translateX(-50%) scale(0.85); opacity: 0.35; }
  }

  @keyframes seal-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  /* 실제 물개 사진 컨테이너 */
  .seal-breathing {
    position: relative;
    width: 160px;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: seal-breathe 3.5s ease-in-out infinite;
  }
  @keyframes seal-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
  }

  /* 물개 사진 */
  .seal-photo {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.12);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
    user-select: none;
    -webkit-user-drag: none;
    transition: filter 0.5s ease;
  }
  .seal-photo-sad {
    filter: grayscale(40%) brightness(0.85);
  }
  .seal-photo-happy {
    filter: brightness(1.08) saturate(1.1);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 20px rgba(255,220,100,0.2);
  }

  /* 슬플 때 눈물 오버레이 */
  .tear-overlay {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 40px;
    pointer-events: none;
  }
  .tear {
    position: absolute;
    width: 6px;
    height: 12px;
    background: #60a5fa;
    border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
    animation: tear-fall 1.5s ease-in infinite;
    opacity: 0.85;
  }
  .tear-left { left: 15px; animation-delay: 0s; }
  .tear-right { right: 15px; animation-delay: 0.7s; }
  @keyframes tear-fall {
    0% { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(25px); opacity: 0; }
  }

  /* 행복 볼 빨개짐 오버레이 */
  .happy-overlay {
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 30px;
    pointer-events: none;
  }
  .happy-blush {
    position: absolute;
    width: 28px;
    height: 14px;
    background: rgba(251,113,133,0.35);
    border-radius: 50%;
    animation: blush-pulse 2s ease-in-out infinite;
  }
  .happy-blush.bl { left: 5px; }
  .happy-blush.br { right: 5px; }
  @keyframes blush-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  /* Lv5 황금 파티클 */
  .lv5-sparkle {
    position: absolute;
    font-size: 16px;
    z-index: 10;
    pointer-events: none;
    animation: lv5-orbit 3s ease-in-out infinite;
  }
  .lv5-sparkle.sp1 { top: 5px; left: 10px; animation-delay: 0s; }
  .lv5-sparkle.sp2 { top: 5px; right: 10px; animation-delay: 1s; }
  .lv5-sparkle.sp3 { bottom: 20px; left: 50%; transform: translateX(-50%); animation-delay: 2s; }
  @keyframes lv5-orbit {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
    50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
  }

  /* Tap jiggle reaction */
  .seal-tap-jiggle {
    animation: tap-jiggle 0.5s ease-in-out !important;
  }
  @keyframes tap-jiggle {
    0% { transform: translateY(0) rotate(0deg); }
    15% { transform: translateY(-6px) rotate(-5deg); }
    30% { transform: translateY(0) rotate(5deg); }
    45% { transform: translateY(-3px) rotate(-3deg); }
    60% { transform: translateY(0) rotate(2deg); }
    75% { transform: translateY(-1px) rotate(-1deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }

  /* Tap emoji popup */
  .tap-emoji {
    position: absolute;
    font-size: 28px;
    pointer-events: none;
    z-index: 20;
    animation: tap-emoji-pop 0.8s ease-out forwards;
  }
  @keyframes tap-emoji-pop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
    30% { transform: translate(-50%, -80%) scale(1.3); opacity: 1; }
    100% { transform: translate(-50%, -140%) scale(0.6); opacity: 0; }
  }

  /* === IDLE BEHAVIORS === */

  /* Scratch */
  .idle-scratch {
    animation: idle-scratch 1.5s ease-in-out !important;
  }
  @keyframes idle-scratch {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    15% { transform: translateY(-2px) rotate(-8deg); }
    30% { transform: translateY(0) rotate(-6deg); }
    45% { transform: translateY(-2px) rotate(-8deg); }
    60% { transform: translateY(0) rotate(-6deg); }
    75% { transform: translateY(-2px) rotate(-8deg); }
    90% { transform: translateY(0) rotate(-3deg); }
  }

  /* Yawn */
  .idle-yawn {
    animation: idle-yawn 1.5s ease-in-out !important;
  }
  @keyframes idle-yawn {
    0%, 100% { transform: translateY(0) scale(1); }
    20% { transform: translateY(-4px) scale(1.05, 1.08); }
    50% { transform: translateY(-6px) scale(1.08, 1.12); }
    80% { transform: translateY(-2px) scale(1.02, 1.04); }
  }

  /* Stretch */
  .idle-stretch {
    animation: idle-stretch 1.5s ease-in-out !important;
  }
  @keyframes idle-stretch {
    0%, 100% { transform: scaleX(1) scaleY(1); }
    30% { transform: scaleX(1.15) scaleY(0.9); }
    60% { transform: scaleX(0.92) scaleY(1.1); }
  }

  /* Wiggle */
  .idle-wiggle {
    animation: idle-wiggle 1.5s ease-in-out !important;
  }
  @keyframes idle-wiggle {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    10% { transform: translateX(-4px) rotate(-3deg); }
    20% { transform: translateX(4px) rotate(3deg); }
    30% { transform: translateX(-4px) rotate(-3deg); }
    40% { transform: translateX(4px) rotate(3deg); }
    50% { transform: translateX(-3px) rotate(-2deg); }
    60% { transform: translateX(3px) rotate(2deg); }
    70% { transform: translateX(-2px) rotate(-1deg); }
    80% { transform: translateX(2px) rotate(1deg); }
    90% { transform: translateX(0); }
  }

  /* Look around */
  .idle-look-around {
    animation: idle-look 1.5s ease-in-out !important;
  }
  @keyframes idle-look {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg) translateY(-3px); }
    75% { transform: rotate(10deg) translateY(-3px); }
  }

  /* Sneeze */
  .idle-sneeze {
    animation: idle-sneeze 1.5s ease-in-out !important;
  }
  @keyframes idle-sneeze {
    0%, 60%, 100% { transform: translateY(0) scale(1); }
    65% { transform: translateY(2px) scale(1.04, 0.96); }
    70% { transform: translateY(-8px) scale(0.94, 1.1); }
    80% { transform: translateY(-2px) scale(1.02); }
    90% { transform: translateY(0) scale(0.99); }
  }

  /* Roll over */
  .idle-roll-over {
    animation: idle-roll 2s ease-in-out !important;
  }
  @keyframes idle-roll {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(15deg) translateY(-5px); }
    50% { transform: rotate(360deg) translateY(-10px); }
    75% { transform: rotate(360deg) translateY(-3px); }
  }

  /* Shake water off */
  .idle-shake-water {
    animation: idle-shake 1.8s ease-in-out !important;
  }
  @keyframes idle-shake {
    0%, 100% { transform: rotate(0deg) scale(1); }
    8% { transform: rotate(-12deg) scale(1.02); }
    16% { transform: rotate(12deg) scale(1.02); }
    24% { transform: rotate(-10deg) scale(1.01); }
    32% { transform: rotate(10deg) scale(1.01); }
    40% { transform: rotate(-8deg); }
    48% { transform: rotate(8deg); }
    56% { transform: rotate(-5deg); }
    64% { transform: rotate(5deg); }
    72% { transform: rotate(-3deg); }
    80% { transform: rotate(2deg); }
    90% { transform: rotate(0deg); }
  }

  /* 쓰다듬기 */
  .seal-pet {
    animation: seal-pet-anim 1.5s ease-in-out !important;
  }
  @keyframes seal-pet-anim {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-4px) rotate(-3deg); }
    50% { transform: translateY(0) rotate(3deg); }
    75% { transform: translateY(-4px) rotate(-2deg); }
  }

  /* 공놀이 */
  .seal-play {
    animation: seal-play-anim 2s ease-in-out !important;
  }
  @keyframes seal-play-anim {
    0% { transform: translateY(0) translateX(0); }
    25% { transform: translateY(-20px) translateX(10px); }
    50% { transform: translateY(0) translateX(-10px); }
    75% { transform: translateY(-15px) translateX(5px); }
    100% { transform: translateY(0) translateX(0); }
  }

  /* 재주 부리기 */
  .seal-trick {
    animation: seal-trick-anim 2.5s ease-in-out !important;
  }
  @keyframes seal-trick-anim {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(0deg) scale(1.1); }
    50% { transform: rotate(360deg) scale(1); }
    75% { transform: rotate(360deg) scale(1.05) translateY(-10px); }
    100% { transform: rotate(360deg) scale(1) translateY(0); }
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

  /* 몸통 - rounder baby harp seal */
  .seal-body {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 130px;
    height: 105px;
    background: linear-gradient(160deg, #f0f0f0 0%, #e8e8ec 20%, #d4d4dc 50%, #c8c8d2 80%, #bbbbc5 100%);
    border-radius: 52% 52% 48% 48% / 55% 55% 48% 48%;
    box-shadow:
      inset 0 -10px 20px rgba(0,0,0,0.08),
      inset 0 6px 12px rgba(255,255,255,0.4),
      0 6px 20px rgba(0,0,0,0.25),
      0 2px 6px rgba(0,0,0,0.15);
  }
  /* Soft fur highlight */
  .seal-body::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 20px;
    width: 60px;
    height: 30px;
    background: radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%);
    border-radius: 50%;
  }
  /* Belly */
  .seal-body::after {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 85px;
    height: 55px;
    background: linear-gradient(180deg, rgba(245,245,248,0.6) 0%, rgba(250,250,252,0.8) 100%);
    border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
  }
  /* Baby harp seal belly spot */
  .seal-belly-spot {
    position: absolute;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 12px;
    background: rgba(200, 200, 210, 0.3);
    border-radius: 50%;
    z-index: 1;
  }

  .seal-face {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    height: 65px;
    z-index: 2;
  }
  .seal-eyes {
    display: flex;
    justify-content: center;
    gap: 26px;
    margin-top: 10px;
  }
  .seal-eye {
    width: 24px;
    height: 24px;
    background: #1a1a2e;
    border-radius: 50%;
    position: relative;
    overflow: hidden;
    transition: transform 0.15s ease;
  }
  .eye-blink {
    transform: scaleY(0.08) !important;
  }
  .eye-pupil {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
  }
  .eye-shine {
    position: absolute;
    top: 3px;
    left: 5px;
    width: 9px;
    height: 9px;
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
  .eye-happy {
    height: 13px;
    border-radius: 13px 13px 0 0;
    background: #1a1a2e;
    overflow: visible;
  }
  .eye-happy .eye-pupil { display: none; }
  .eye-sad { transform: scaleY(0.8); }
  .eye-sad::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -2px;
    width: 28px;
    height: 8px;
    border-bottom: 2px solid #6b7280;
    border-radius: 0 0 50% 50%;
    transform: rotate(-5deg);
  }
  .tear {
    position: absolute;
    bottom: -12px;
    width: 6px;
    height: 10px;
    background: #60a5fa;
    border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
    animation: tear-fall 1.5s ease-in infinite;
    opacity: 0.8;
    z-index: 5;
  }
  .tear-left { left: 4px; animation-delay: 0s; }
  .tear-right { right: 4px; animation-delay: 0.7s; }
  @keyframes tear-fall {
    0% { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(20px); opacity: 0; }
  }
  .seal-nose {
    width: 14px;
    height: 10px;
    background: radial-gradient(circle, #2d2d3e 40%, #374151 100%);
    border-radius: 50%;
    margin: 4px auto 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    animation: nose-twitch 6s ease-in-out infinite;
  }
  @keyframes nose-twitch {
    0%, 85%, 100% { transform: scale(1); }
    88% { transform: scale(1.15, 0.9); }
    91% { transform: scale(0.95, 1.05); }
    94% { transform: scale(1.05, 0.97); }
  }
  .seal-mouth {
    width: 16px;
    height: 6px;
    border-bottom: 2px solid #4b5563;
    border-radius: 0 0 50% 50%;
    margin: 1px auto 0;
  }
  .mouth-happy {
    width: 22px;
    height: 9px;
    border-bottom: 2.5px solid #4b5563;
    border-radius: 0 0 50% 50%;
  }
  .mouth-sad {
    border-bottom: none;
    border-top: 2px solid #4b5563;
    border-radius: 50% 50% 0 0;
  }
  .seal-whiskers {
    position: absolute;
    top: 36px;
    left: 50%;
    transform: translateX(-50%);
    width: 110px;
  }
  .whisker {
    position: absolute;
    height: 1.5px;
    width: 24px;
    background: rgba(160, 165, 175, 0.6);
    border-radius: 1px;
    transition: transform 0.3s ease;
  }
  .whisker-left-top { left: 4px; top: 0; transform: rotate(-8deg); }
  .whisker-left-bottom { left: 6px; top: 7px; transform: rotate(8deg); }
  .whisker-right-top { right: 4px; top: 0; transform: rotate(8deg); }
  .whisker-right-bottom { right: 6px; top: 7px; transform: rotate(-8deg); }

  /* Whisker wiggle on idle */
  .idle-sneeze .whisker-left-top,
  .idle-sneeze .whisker-right-top {
    animation: whisker-flare 0.3s ease-in-out 3;
  }
  @keyframes whisker-flare {
    0%, 100% { transform: rotate(-8deg); }
    50% { transform: rotate(-18deg) translateX(-3px); }
  }

  .seal-blush {
    position: absolute;
    width: 16px;
    height: 9px;
    background: rgba(251, 113, 133, 0.3);
    border-radius: 50%;
    top: 32px;
    animation: blush-pulse 2s ease-in-out infinite;
  }
  @keyframes blush-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.55; }
  }
  .seal-blush-left { left: 12px; }
  .seal-blush-right { right: 12px; }

  /* Flippers */
  .seal-flipper {
    position: absolute;
    width: 30px;
    height: 20px;
    background: linear-gradient(180deg, #c8c8d2, #d4d4dc);
    border-radius: 60% 60% 50% 50%;
    top: 55px;
    z-index: 1;
    transition: transform 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .seal-flipper-left {
    left: -12px;
    transform: rotate(25deg);
    transform-origin: right center;
    animation: flipper-wave 2.5s ease-in-out infinite;
  }
  .seal-flipper-right {
    right: -12px;
    transform: rotate(-25deg);
    transform-origin: left center;
    animation: flipper-wave-right 2.5s ease-in-out infinite;
    animation-delay: 1.2s;
  }
  @keyframes flipper-wave {
    0%, 100% { transform: rotate(25deg); }
    50% { transform: rotate(15deg); }
  }
  @keyframes flipper-wave-right {
    0%, 100% { transform: rotate(-25deg); }
    50% { transform: rotate(-15deg); }
  }

  /* Active independent flipper wave */
  .flipper-active-wave {
    animation: flipper-excited 0.8s ease-in-out !important;
  }
  @keyframes flipper-excited {
    0% { transform: rotate(25deg); }
    20% { transform: rotate(-5deg); }
    40% { transform: rotate(30deg); }
    60% { transform: rotate(0deg); }
    80% { transform: rotate(25deg); }
    100% { transform: rotate(25deg); }
  }
  .flipper-active-wave-right {
    animation: flipper-excited-right 0.8s ease-in-out !important;
  }
  @keyframes flipper-excited-right {
    0% { transform: rotate(-25deg); }
    20% { transform: rotate(5deg); }
    40% { transform: rotate(-30deg); }
    60% { transform: rotate(0deg); }
    80% { transform: rotate(-25deg); }
    100% { transform: rotate(-25deg); }
  }

  .seal-tail {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 15px;
    z-index: 0;
    animation: tail-wag 4s ease-in-out infinite;
  }
  @keyframes tail-wag {
    0%, 100% { transform: translateX(-50%) rotate(0deg); }
    25% { transform: translateX(-50%) rotate(5deg); }
    75% { transform: translateX(-50%) rotate(-5deg); }
  }
  .seal-tail::before,
  .seal-tail::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 17px;
    height: 13px;
    background: #c0c0ca;
    border-radius: 50%;
  }
  .seal-tail::before { left: 0; transform: rotate(-15deg); }
  .seal-tail::after { right: 0; transform: rotate(15deg); }

  /* 물고기 날아가기 */
  .fish-fly {
    position: absolute;
    font-size: 28px;
    z-index: 10;
    animation: fish-to-seal 0.8s ease-in forwards;
    pointer-events: none;
  }
  @keyframes fish-to-seal {
    0% { bottom: -20px; left: 50%; transform: translateX(-50%) rotate(0deg) scale(1); opacity: 1; }
    70% { bottom: 60px; left: 50%; transform: translateX(-50%) rotate(-20deg) scale(0.8); opacity: 1; }
    100% { bottom: 80px; left: 50%; transform: translateX(-50%) rotate(-30deg) scale(0.3); opacity: 0; }
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

  /* 하트 떠오르기 */
  .heart-float {
    position: absolute;
    bottom: 40%;
    font-size: 20px;
    animation: heart-rise 1.5s ease-out forwards;
    pointer-events: none;
  }
  @keyframes heart-rise {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
    100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
  }

  /* 공 튀기기 */
  .ball-bounce {
    position: absolute;
    font-size: 24px;
    z-index: 10;
    animation: ball-anim 2s ease-in-out forwards;
    pointer-events: none;
  }
  @keyframes ball-anim {
    0% { top: 80%; left: 20%; transform: scale(1); }
    20% { top: 20%; left: 40%; transform: scale(0.8); }
    40% { top: 50%; left: 60%; transform: scale(1); }
    60% { top: 15%; left: 50%; transform: scale(0.7); }
    80% { top: 45%; left: 35%; transform: scale(0.9); }
    100% { top: 60%; left: 50%; transform: scale(0) rotate(720deg); opacity: 0; }
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
