"use client";

import { useState, useEffect, useRef } from "react";

const MAX_AMOUNT = 100000; // 최대 10만원 기준
const ACCOUNT_NUMBER = "93800201061114";
const ACCOUNT_BANK = "국민은행";
const ACCOUNT_HOLDER = "재우";

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
          <span>🐷</span>
          <span>죽기스 벌금통</span>
        </h2>

        {/* 돼지저금통 SVG */}
        <div className="piggy-wrapper" onClick={triggerCoinRain}>
          <PiggyBankSVG fillPercent={fillPercent} paidPercent={paidPercent} total={data?.grandTotal || 0} />
        </div>

        {/* 금액 표시 */}
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-yellow-400 money-pulse">
            {formatKRW(data?.grandTotal || 0)}
          </div>
          <div className="text-sm text-zinc-500">총 누적 벌금</div>
        </div>

        {/* 납부 현황 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>미납 <span className="text-red-400 font-semibold">{formatKRW(data?.unpaidTotal || 0)}</span></span>
            <span>납부완료 <span className="text-green-400 font-semibold">{formatKRW(data?.paidTotal || 0)}</span></span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 relative">
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
        <div className="bg-zinc-800/60 rounded-xl p-4 space-y-3 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">{ACCOUNT_BANK} · {ACCOUNT_HOLDER}</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-white">{ACCOUNT_NUMBER}</p>
            </div>
            <button
              onClick={copyAccount}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              }`}
            >
              {copied ? "✓ 복사됨" : "복사"}
            </button>
          </div>
        </div>

        {/* 벌금 규정 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-green-400 font-semibold">10:04 이전</p>
              <p className="text-zinc-400 text-xs">벌금 없음</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-yellow-400 font-semibold">10:04 ~ 10:15</p>
              <p className="text-zinc-400 text-xs">2,000원</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <span className="text-lg">💸</span>
            <div>
              <p className="text-red-400 font-semibold">10:16 이후</p>
              <p className="text-zinc-400 text-xs">5,000원</p>
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
          <div className="space-y-3 pt-2 border-t border-zinc-700">
            <p className="text-xs text-zinc-400">📸 송금 증빙 사진 제출 즉시 납부 완료 처리돼요!</p>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">납부 금액</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="예: 2000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">메모 (선택)</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="예: 3/20 지각분"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">입금 증빙 사진 (선택)</label>
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
                  className="w-full py-3 border border-dashed border-zinc-600 rounded-xl text-zinc-500 text-sm hover:border-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  📷 사진 첨부
                </button>
              )}
            </div>
            <button
              onClick={handleSubmitPayment}
              disabled={submitting || !payAmount}
              className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-95"
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
                    <span className="text-zinc-300">
                      {i === 0 && u.total > 0 ? "👑 " : ""}{u.name}
                    </span>
                    <span className={u.total === 0 ? "text-green-400" : "text-red-400"}>
                      {u.total === 0 ? "✅ 벌금없음" : formatKRW(u.total)}
                    </span>
                  </div>
                  {u.total > 0 && (
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
                className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg text-green-400">✅</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{p.name}</p>
                    <p className="text-xs text-zinc-500">
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

function PiggyBankSVG({ fillPercent, paidPercent, total }: { fillPercent: number; paidPercent: number; total: number }) {
  // 오징어게임 스타일 황금 돼지 저금통
  const fillHeight = (fillPercent / 100) * 160;
  const paidHeight = (paidPercent / 100) * 160;
  const fillY = 200 - fillHeight;
  const paidY = 200 - paidHeight;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="220" height="240" viewBox="0 0 220 240" className="drop-shadow-xl">
        <defs>
          {/* 금색 그라데이션 */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          {/* 빨간 (미납) 그라데이션 */}
          <linearGradient id="redGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
          </linearGradient>
          {/* 초록 (납부) 그라데이션 */}
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.95" />
          </linearGradient>
          {/* 유리 반사 */}
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="50%" stopColor="white" stopOpacity="0.05" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          {/* 클리핑 마스크 - 돼지 모양 */}
          <clipPath id="piggyClip">
            {/* 몸통 */}
            <ellipse cx="110" cy="160" rx="75" ry="70" />
          </clipPath>
        </defs>

        {/* === 돼지 그림자 === */}
        <ellipse cx="110" cy="232" rx="70" ry="8" fill="rgba(0,0,0,0.3)" />

        {/* === 다리 4개 === */}
        {[70, 90, 120, 140].map((x, i) => (
          <g key={i}>
            <rect x={x} y="216" width="14" height="16" rx="7" fill="url(#goldGrad)" />
            <rect x={x} y="228" width="14" height="6" rx="3" fill="#a16207" />
          </g>
        ))}

        {/* === 꼬리 === */}
        <path d="M 185 160 Q 205 145 195 130 Q 185 115 200 105" fill="none" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" />

        {/* === 몸통 배경 === */}
        <ellipse cx="110" cy="160" rx="75" ry="70" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="3" />

        {/* === 채워진 돈 (미납 - 빨강) === */}
        {fillPercent > 0 && (
          <rect
            x="35"
            y={fillY}
            width="150"
            height={fillHeight}
            fill="url(#redGrad)"
            clipPath="url(#piggyClip)"
          >
            <animate
              attributeName="y"
              from="200"
              to={fillY}
              dur="1.2s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.25 0.1 0.25 1"
            />
            <animate
              attributeName="height"
              from="0"
              to={fillHeight}
              dur="1.2s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.25 0.1 0.25 1"
            />
          </rect>
        )}

        {/* === 납부 완료 분 (초록) === */}
        {paidPercent > 0 && (
          <rect
            x="35"
            y={paidY}
            width="150"
            height={paidHeight}
            fill="url(#greenGrad)"
            clipPath="url(#piggyClip)"
          >
            <animate
              attributeName="y"
              from="200"
              to={paidY}
              dur="1.5s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.25 0.1 0.25 1"
            />
            <animate
              attributeName="height"
              from="0"
              to={paidHeight}
              dur="1.5s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.25 0.1 0.25 1"
            />
          </rect>
        )}

        {/* === 금액 텍스트 (돼지 몸통 안) === */}
        {total > 0 && (
          <>
            <text x="110" y="158" textAnchor="middle" fontSize="13" fontWeight="bold" fill="rgba(255,255,255,0.9)" fontFamily="monospace">
              {total.toLocaleString("ko-KR")}
            </text>
            <text x="110" y="174" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.6)" fontFamily="system-ui">
              원
            </text>
          </>
        )}
        {total === 0 && (
          <text x="110" y="168" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">
            비어있어요
          </text>
        )}

        {/* === 몸통 윤곽 (금 테두리) === */}
        <ellipse cx="110" cy="160" rx="75" ry="70" fill="none" stroke="url(#goldGrad)" strokeWidth="2.5" />

        {/* === 유리 반사 효과 === */}
        <ellipse cx="110" cy="160" rx="75" ry="70" fill="url(#glassGrad)" />
        <ellipse cx="85" cy="135" rx="25" ry="18" fill="rgba(255,255,255,0.06)" />

        {/* === 머리 === */}
        <circle cx="110" cy="90" r="38" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="2.5" />
        <circle cx="110" cy="90" r="38" fill="url(#glassGrad)" />

        {/* === 귀 === */}
        <ellipse cx="78" cy="62" rx="13" ry="16" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="2" transform="rotate(-15 78 62)" />
        <ellipse cx="78" cy="62" rx="8" ry="10" fill="#2d1a1a" transform="rotate(-15 78 62)" />
        <ellipse cx="142" cy="62" rx="13" ry="16" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="2" transform="rotate(15 142 62)" />
        <ellipse cx="142" cy="62" rx="8" ry="10" fill="#2d1a1a" transform="rotate(15 142 62)" />

        {/* === 눈 === */}
        <circle cx="95" cy="85" r="7" fill="#111" stroke="url(#goldGrad)" strokeWidth="1.5" />
        <circle cx="125" cy="85" r="7" fill="#111" stroke="url(#goldGrad)" strokeWidth="1.5" />
        <circle cx="97" cy="83" r="2.5" fill="white" />
        <circle cx="127" cy="83" r="2.5" fill="white" />

        {/* === 코 === */}
        <ellipse cx="110" cy="103" rx="14" ry="10" fill="#1a0a0a" stroke="url(#goldGrad)" strokeWidth="1.5" />
        <circle cx="104" cy="103" r="4" fill="#2d1212" />
        <circle cx="116" cy="103" r="4" fill="#2d1212" />
        <circle cx="103" cy="102" r="1.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="115" cy="102" r="1.5" fill="rgba(255,255,255,0.3)" />

        {/* === 동전 투입구 === */}
        <rect x="92" y="55" width="36" height="6" rx="3" fill="#1c1c1c" stroke="url(#goldGrad)" strokeWidth="1.5" />

        {/* === 몸통-머리 연결 === */}
        <ellipse cx="110" cy="122" rx="30" ry="12" fill="#1c1c1c" stroke="none" />
        <ellipse cx="110" cy="90" rx="38" ry="38" fill="none" stroke="url(#goldGrad)" strokeWidth="2.5" />
      </svg>

      {/* 범례 */}
      <div className="flex gap-4 mt-1">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <div className="w-3 h-3 rounded-sm bg-red-500"></div>
          <span>미납</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span>납부완료</span>
        </div>
      </div>
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
