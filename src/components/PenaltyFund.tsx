"use client";

import { useState, useEffect, useRef } from "react";

const MAX_AMOUNT = 100000; // 최대 10만원 기준
const ACCOUNT_NUMBER = "93800201061114";
const ACCOUNT_BANK = "국민은행";
const ACCOUNT_HOLDER = "김재우";

interface Payment {
  id: string;
  name: string;
  amount: number;
  confirmed: boolean;
  note: string | null;
  proof_image_url: string | null;
  created_at: string;
  payment_date: string;
}

interface UserPenalty {
  user_id: string;
  name: string;
  total: number;
}

interface FundData {
  grandTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  userPenalties: UserPenalty[];
  payments: Payment[];
}

export default function PenaltyFund({ userId, userName }: { userId: string; userName: string }) {
  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payProof, setPayProof] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coinRain, setCoinRain] = useState(false);
  const [prevTotal, setPrevTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/penalty-fund");
      if (res.ok) {
        const d = await res.json();
        if (prevTotal > 0 && d.grandTotal > prevTotal) {
          triggerCoinRain();
        }
        setPrevTotal(d.grandTotal);
        setData(d);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const triggerCoinRain = () => {
    setCoinRain(true);
    setTimeout(() => setCoinRain(false), 2500);
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleProofImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPayProof(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    const amount = parseInt(payAmount);
    if (!amount || amount <= 0) return;
    setSubmitting(true);

    let proofUrl: string | null = null;

    // 이미지 업로드
    if (payProof) {
      try {
        const blob = await (await fetch(payProof)).blob();
        const fileName = `payment_${userId}_${Date.now()}.jpg`;
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: uploadData } = await sb.storage
          .from("checkin-images")
          .upload(fileName, blob, { contentType: "image/jpeg" });
        if (uploadData) {
          const { data: urlData } = sb.storage
            .from("checkin-images")
            .getPublicUrl(fileName);
          proofUrl = urlData.publicUrl;
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch("/api/penalty-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount,
          proof_image_url: proofUrl,
          note: payNote || null,
        }),
      });

      if (res.ok) {
        setShowPayForm(false);
        setPayAmount("");
        setPayNote("");
        setPayProof(null);
        fetchData();
        triggerCoinRain();
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const dynamicMax = data ? Math.max(MAX_AMOUNT, data.grandTotal) : MAX_AMOUNT;
  const fillPercent = data ? Math.min(100, (data.grandTotal / dynamicMax) * 100) : 0;
  const paidPercent = data ? Math.min(100, (data.paidTotal / dynamicMax) * 100) : 0;

  const formatKRW = (n: number) => n.toLocaleString("ko-KR") + "원";

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <p className="text-zinc-500 animate-pulse">벌금통 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{styles}</style>

      {/* 코인 비 */}
      {coinRain && (
        <div className="coin-rain-container">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="coin-drop"
              style={{
                left: `${5 + Math.random() * 90}%`,
                animationDelay: `${Math.random() * 1.2}s`,
                animationDuration: `${0.8 + Math.random() * 0.8}s`,
              }}
            >
              🪙
            </div>
          ))}
        </div>
      )}

      {/* 돼지저금통 메인 카드 */}
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🔐</span>
          <span>죽기스 벌금통</span>
        </h2>

        {/* 금고 SVG */}
        <div className="piggy-wrapper" onClick={triggerCoinRain}>
          <VaultSVG total={data?.grandTotal || 0} fillPercent={fillPercent} />
        </div>

        {/* 금액 표시 */}
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-yellow-500 money-pulse">
            {formatKRW(data?.grandTotal || 0)}
          </div>
          <div className="text-sm text-gray-500">총 누적 벌금</div>
        </div>

        {/* 납부 현황 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>미납 <span className="text-red-500 font-semibold">{formatKRW(data?.unpaidTotal || 0)}</span></span>
            <span>납부완료 <span className="text-green-500 font-semibold">{formatKRW(data?.paidTotal || 0)}</span></span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${fillPercent}%`,
                background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)",
              }}
            />
            <div
              className="h-full rounded-full absolute top-0 left-0 transition-all duration-1000"
              style={{
                width: `${paidPercent}%`,
                background: "linear-gradient(90deg, #16a34a, #22c55e)",
              }}
            />
          </div>
        </div>
      </div>

      {/* 납부 안내 카드 */}
      <div className="card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <span>🏦</span>
          <span>벌금 납부 안내</span>
        </h3>

        {/* 계좌 정보 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">{ACCOUNT_BANK} · {ACCOUNT_HOLDER}</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-gray-900">{ACCOUNT_NUMBER}</p>
            </div>
            <button
              onClick={copyAccount}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              {copied ? "✓ 복사됨" : "복사"}
            </button>
          </div>
        </div>

        {/* 벌금 규정 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-green-600 font-semibold">10:04 이전</p>
              <p className="text-gray-500 text-xs">벌금 없음</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-amber-600 font-semibold">10:04 ~ 10:15</p>
              <p className="text-gray-500 text-xs">2,000원</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <span className="text-lg">💸</span>
            <div>
              <p className="text-red-500 font-semibold">10:16 이후</p>
              <p className="text-gray-500 text-xs">5,000원</p>
            </div>
          </div>
        </div>

        {/* 납부하기 버튼 */}
        <button
          onClick={() => setShowPayForm(!showPayForm)}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-300 transition-all active:scale-95"
        >
          💳 송금 완료 인증
        </button>

        {/* 납부 폼 */}
        {showPayForm && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">📸 송금 증빙 사진 제출 즉시 납부 완료 처리돼요!</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">납부 금액</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="예: 2000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">메모 (선택)</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="예: 3/20 지각분"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">입금 증빙 사진 (선택)</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleProofImage} className="hidden" />
              {payProof ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={payProof} alt="증빙" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    onClick={() => setPayProof(null)}
                    className="absolute top-2 right-2 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs"
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-400 text-sm hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  📷 사진 첨부
                </button>
              )}
            </div>
            <button
              onClick={handleSubmitPayment}
              disabled={submitting || !payAmount}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-95"
            >
              {submitting ? "제출 중..." : "제출하기"}
            </button>
          </div>
        )}
      </div>

      {/* 멤버별 벌금 현황 */}
      <div className="card space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <span>📊</span>
          <span>멤버별 벌금</span>
        </h3>
        <div className="space-y-2">
          {(data?.userPenalties || [])
            .sort((a, b) => b.total - a.total)
            .map((u, i) => {
              const pct = Math.min(100, (u.total / 10000) * 100);
              return (
                <div key={u.user_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {i === 0 && u.total > 0 ? "👑 " : ""}{u.name}
                    </span>
                    <span className={u.total === 0 ? "text-green-500" : "text-red-500"}>
                      {u.total === 0 ? "✅ 벌금없음" : formatKRW(u.total)}
                    </span>
                  </div>
                  {u.total > 0 && (
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #dc2626, #ef4444)",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 납부 내역 */}
      {(data?.payments || []).length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <span>📝</span>
            <span>납부 내역</span>
          </h3>
          <div className="space-y-2">
            {data?.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg text-green-400">✅</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-400">{formatKRW(p.amount)}</p>
                  <p className="text-xs text-green-600">납부완료</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VaultSVG({ total, fillPercent }: { total: number; fillPercent: number }) {
  const cx = 110, cy = 138, r = 72;
  const fillH = Math.max(0, (fillPercent / 100) * (r * 2));
  const fillY = cy + r - fillH;
  const dialAngle = (fillPercent / 100) * 270 - 135; // dial rotates with fill

  const notches = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <div className="relative flex flex-col items-center">
      <svg width="280" height="290" viewBox="0 0 220 240" className="drop-shadow-xl">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="fillGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#92400e" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <linearGradient id="doorGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={fillPercent > 0 ? 0.12 : 0} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="doorClip">
            <circle cx={cx} cy={cy} r={r - 2} />
          </clipPath>
        </defs>

        {/* 바닥 그림자 */}
        <ellipse cx="110" cy="234" rx="82" ry="8" fill="rgba(0,0,0,0.45)" />

        {/* 금고 본체 */}
        <rect x="18" y="22" width="184" height="204" rx="20" fill="url(#bodyGrad)" />
        <rect x="18" y="22" width="184" height="204" rx="20" fill="none" stroke="url(#goldGrad)" strokeWidth="2" />

        {/* 패널 라인 (디테일) */}
        <rect x="26" y="30" width="168" height="188" rx="14" fill="none" stroke="rgba(234,179,8,0.15)" strokeWidth="1" />

        {/* 동전 투입구 */}
        <rect x="78" y="30" width="64" height="9" rx="4.5" fill="#111" stroke="url(#goldGrad)" strokeWidth="1.5" />

        {/* 왼쪽 경첩 */}
        <rect x="18" y="68" width="11" height="24" rx="5.5" fill="url(#goldGrad)" />
        <rect x="18" y="148" width="11" height="24" rx="5.5" fill="url(#goldGrad)" />

        {/* 도어 금색 외곽 링 */}
        <circle cx={cx} cy={cy} r={r + 6} fill="url(#goldGrad)" />
        <circle cx={cx} cy={cy} r={r + 3} fill="#111" />

        {/* 도어 본체 */}
        <circle cx={cx} cy={cy} r={r} fill="url(#doorGrad)" />

        {/* 금액 채워짐 */}
        <rect
          x={cx - r}
          y={fillY}
          width={r * 2}
          height={fillH + 2}
          fill="url(#fillGrad)"
          clipPath="url(#doorClip)"
        />

        {/* 채워짐 상단 물결 효과 */}
        {fillPercent > 0 && (
          <ellipse
            cx={cx}
            cy={fillY}
            rx={r - 2}
            ry={5}
            fill="#fbbf24"
            fillOpacity="0.4"
            clipPath="url(#doorClip)"
          />
        )}

        {/* 글로우 */}
        <circle cx={cx} cy={cy} r={r} fill="url(#glowGrad)" clipPath="url(#doorClip)" />

        {/* 도어 내부 장식 링 */}
        <circle cx={cx} cy={cy} r={r - 10} fill="none" stroke="rgba(234,179,8,0.25)" strokeWidth="1.5" strokeDasharray="5 4" />

        {/* 다이얼 눈금 */}
        {notches.map((angle) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const isMajor = angle % 90 === 0;
          const inner = isMajor ? r - 20 : r - 16;
          const outer = r - 10;
          return (
            <line
              key={angle}
              x1={cx + inner * Math.cos(rad)}
              y1={cy + inner * Math.sin(rad)}
              x2={cx + outer * Math.cos(rad)}
              y2={cy + outer * Math.sin(rad)}
              stroke={isMajor ? "rgba(234,179,8,0.7)" : "rgba(234,179,8,0.3)"}
              strokeWidth={isMajor ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* 다이얼 원 */}
        <circle cx={cx} cy={cy} r="24" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="18" fill="#111" stroke="rgba(234,179,8,0.3)" strokeWidth="1" />

        {/* 다이얼 포인터 (금액에 따라 회전) */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + 14 * Math.cos(((dialAngle - 90) * Math.PI) / 180)}
          y2={cy + 14 * Math.sin(((dialAngle - 90) * Math.PI) / 180)}
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <circle cx={cx} cy={cy} r="4.5" fill="url(#goldGrad)" />

        {/* 핸들 */}
        <rect x="190" y="118" width="13" height="44" rx="6.5" fill="url(#goldGrad)" />
        <rect x="192" y="125" width="9" height="30" rx="4.5" fill="#a16207" fillOpacity="0.5" />

        {/* 도어 유리 반사 */}
        <ellipse cx={cx - 22} cy={cy - 28} rx="20" ry="14" fill="rgba(255,255,255,0.04)" transform={`rotate(-30 ${cx - 22} ${cy - 28})`} />

        {/* 비어있을 때 텍스트 */}
        {total === 0 && (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.18)" fontFamily="system-ui">
            비어있어요
          </text>
        )}
      </svg>

      {total === 0 && (
        <p className="text-xs text-gray-400 -mt-1">아직 벌금이 없어요 🎉</p>
      )}
    </div>
  );
}

const styles = `
  .piggy-wrapper {
    display: flex;
    justify-content: center;
    cursor: pointer;
    filter: drop-shadow(0 8px 24px rgba(234, 179, 8, 0.2));
    transition: transform 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .piggy-wrapper:active {
    transform: scale(0.97);
  }

  .money-pulse {
    animation: money-glow 2s ease-in-out infinite;
  }
  @keyframes money-glow {
    0%, 100% { text-shadow: 0 0 10px rgba(234,179,8,0.3); }
    50% { text-shadow: 0 0 20px rgba(234,179,8,0.7), 0 0 40px rgba(234,179,8,0.3); }
  }

  /* 코인 비 */
  .coin-rain-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  }
  .coin-drop {
    position: absolute;
    top: -40px;
    font-size: 24px;
    animation: coin-fall linear forwards;
  }
  @keyframes coin-fall {
    0% { top: -40px; opacity: 1; transform: rotate(0deg); }
    80% { opacity: 1; }
    100% { top: 100vh; opacity: 0; transform: rotate(720deg); }
  }
`;
