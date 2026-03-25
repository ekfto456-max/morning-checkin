"use client";

import { useState, useEffect } from "react";
import LoginForm from "@/components/LoginForm";
import CheckinUpload from "@/components/CheckinUpload";
import StatusCard from "@/components/StatusCard";
import Leaderboard from "@/components/Leaderboard";
import ExemptionCard from "@/components/ExemptionCard";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import TodayFeed from "@/components/TodayFeed";
import SealCard from "@/components/SealCard";
import MemberBoard from "@/components/MemberBoard";
import PenaltyFund from "@/components/PenaltyFund";
import FloatingChat from "@/components/FloatingChat";
import SealFeed from "@/components/SealFeed";
import ProfileCard from "@/components/ProfileCard";

type User = { id: string; name: string; batch?: string; purpose?: string; avatar_url?: string; custom_deadline_time?: string | null };
type Checkin = {
  id: string;
  status: string;
  penalty: number;
  checkin_time: string;
  image_url: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<Checkin | null>(null);
  const [totalPenalty, setTotalPenalty] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"home" | "seal" | "calendar" | "members" | "fund" | "my">("home");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["home"]));

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => { const next = new Set(prev); next.add(tab); return next; });
  };

  // 실시간 시계
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // PWA Service Worker 등록
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // 유저 세션 복원
  useEffect(() => {
    const stored = localStorage.getItem("checkin_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      fetchStatus(parsed.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/checkin?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setTodayCheckin(data.todayCheckin);
        setTotalPenalty(data.totalPenalty);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    fetchStatus(loggedInUser.id);
  };

  const handleCheckin = (checkin: Checkin) => {
    setTodayCheckin(checkin);
    setTotalPenalty((prev) => prev + checkin.penalty);
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem("checkin_user");
    setUser(null);
    setTodayCheckin(null);
    setTotalPenalty(0);
  };

  const handleExemptionUsed = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const formatClock = (date: Date) => {
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const day = dayNames[date.getDay()];
    const rawH = date.getHours();
    const ampm = rawH < 12 ? "오전" : "오후";
    const h12 = rawH === 0 ? 12 : rawH > 12 ? rawH - 12 : rawH;
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return { day, ampm, h: h12, m, s };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F4F8]">
        <div className="text-center">
          <p className="text-4xl mb-4">💀</p>
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const clock = formatClock(currentTime);

  // 다음 마감일 안내 (개인 마감 시간 기준, KST)
  const getNextDeadlineLabel = () => {
    const now = currentTime;
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    const deadlineStr = user?.custom_deadline_time || "10:03";
    const [dlH, dlM] = deadlineStr.split(":").map(Number);
    const ampm = dlH < 12 ? "오전" : "오후";
    const h12 = dlH === 0 ? 12 : dlH > 12 ? dlH - 12 : dlH;
    const timeLabel = `${ampm} ${h12}:${String(dlM).padStart(2, "0")}`;

    const isPastDeadline = now.getHours() > dlH || (now.getHours() === dlH && now.getMinutes() >= dlM);

    const getNextWeekday = (fromDay: number) => {
      let next = (fromDay + 1) % 7;
      while (next === 0 || next === 6) next = (next + 1) % 7;
      return next;
    };

    if (isWeekend) {
      return `월요일 ${timeLabel}까지 출석하세요`;
    } else if (!isPastDeadline) {
      return `오늘 ${timeLabel}까지 출석하세요`;
    } else {
      const nextDay = getNextWeekday(day);
      return `${dayNames[nextDay]} ${timeLabel}까지 출석하세요`;
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
      {/* 헤더 */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <span>💀</span>
            <span>죽기스</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            안녕하세요,{" "}
            <span className="font-semibold text-gray-700">{user.name}</span>님
            {user.batch && /^\d{1,2}:\d{2}$/.test(user.batch) && (
              <span className="text-gray-400 ml-1">(⏰ {user.batch})</span>
            )}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm"
        >
          로그아웃
        </button>
      </header>

      {/* 실시간 시계 + 마감 — 히어로 카드 */}
      <style>{`
        @keyframes seal-float {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes wave1 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave2 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes bubble {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .seal-float { animation: seal-float 3s ease-in-out infinite; }
        .wave1 { animation: wave1 4s linear infinite; }
        .wave2 { animation: wave2 6s linear infinite; }
        .bubble1 { animation: bubble 3s ease-out infinite; }
        .bubble2 { animation: bubble 4s ease-out 1s infinite; }
        .bubble3 { animation: bubble 3.5s ease-out 0.5s infinite; }
        .star1 { animation: star-twinkle 2s ease-in-out infinite; }
        .star2 { animation: star-twinkle 2.5s ease-in-out 0.5s infinite; }
        .star3 { animation: star-twinkle 1.8s ease-in-out 1s infinite; }
        .clock-colon { animation: clock-blink 1s step-end infinite; }
        @keyframes clock-blink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.15; } }
      `}</style>

      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #1a0a2e 0%, #2d1044 40%, #C0392B 100%)",
          boxShadow: "0 8px 32px rgba(255, 71, 87, 0.35)",
          minHeight: "200px",
        }}
      >
        {/* 별 장식 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="star1 absolute text-white text-xs" style={{ top: "14%", left: "10%" }}>✦</span>
          <span className="star2 absolute text-white text-sm" style={{ top: "20%", left: "80%" }}>✦</span>
          <span className="star3 absolute text-white text-xs" style={{ top: "10%", left: "55%" }}>✦</span>
          <span className="star1 absolute text-white/50 text-xs" style={{ top: "35%", left: "25%" }}>·</span>
          <span className="star2 absolute text-white/50 text-xs" style={{ top: "30%", left: "70%" }}>·</span>
        </div>

        {/* 뭉치 + 텍스트 */}
        <div className="relative z-10 pt-7 pb-3 px-6 text-center">
          {/* 뭉치 이모지 */}
          <div className="seal-float inline-block mb-2 select-none" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}>
            <span style={{ fontSize: "72px", lineHeight: 1 }}>🦭</span>
          </div>

          {/* 기포 */}
          <div className="absolute pointer-events-none" style={{ top: "18%", left: "30%" }}>
            <span className="bubble1 absolute text-white/40 text-xs">●</span>
            <span className="bubble2 absolute text-white/30 text-[8px]" style={{ left: "20px" }}>●</span>
            <span className="bubble3 absolute text-white/20 text-[6px]" style={{ left: "-10px", top: "5px" }}>●</span>
          </div>

          {/* 시계 */}
          <p className="text-white/50 text-sm font-medium mb-1 tracking-wide">{clock.day}</p>
          <div className="text-4xl font-bold text-white mb-0.5">
            <span className="text-2xl" style={{ opacity: 0.7 }}>{clock.ampm} </span>
            <span>{clock.h}시 {clock.m}분</span>
            <span className="text-xl ml-1.5" style={{ opacity: 0.4 }}>{clock.s}초</span>
          </div>
          <p className="text-sm text-white/65 mt-1">{getNextDeadlineLabel()}</p>
        </div>

        {/* 물결 */}
        <div className="relative overflow-hidden" style={{ height: "36px" }}>
          <div className="wave1 absolute bottom-0" style={{ width: "200%", height: "36px" }}>
            <svg viewBox="0 0 800 36" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <path d="M0,18 C100,0 200,36 300,18 C400,0 500,36 600,18 C700,0 800,36 800,18 L800,36 L0,36 Z"
                fill="rgba(255,255,255,0.07)" />
            </svg>
          </div>
          <div className="wave2 absolute bottom-0" style={{ width: "200%", height: "28px" }}>
            <svg viewBox="0 0 800 28" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <path d="M0,14 C120,0 240,28 360,14 C480,0 600,28 720,14 C780,7 800,14 800,14 L800,28 L0,28 Z"
                fill="rgba(255,255,255,0.05)" />
            </svg>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 grid grid-cols-6 gap-1">
        {[
          { id: "home", label: "🏠", sub: "홈" },
          { id: "seal", label: "🦭", sub: "물개" },
          { id: "fund", label: "🔐", sub: "벌금통" },
          { id: "calendar", label: "📅", sub: "캘린더" },
          { id: "members", label: "👥", sub: "현황" },
          { id: "my", label: "😊", sub: "MY" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id as typeof activeTab)}
            className={`flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all gap-0.5 ${
              activeTab === tab.id
                ? "text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
            style={activeTab === tab.id ? {
              background: "linear-gradient(135deg, #FF4757, #C0392B)",
            } : {}}
          >
            <span className="text-base">{tab.label}</span>
            <span>{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* 홈 탭 */}
      <div className={activeTab === "home" ? "space-y-5" : "hidden"}>
        <StatusCard checkin={todayCheckin} totalPenalty={totalPenalty} />
        {!todayCheckin && (
          <>
            <CheckinUpload userId={user.id} onCheckin={handleCheckin} />
            <ExemptionCard
              userId={user.id}
              hasCheckedInToday={false}
              onExemptionUsed={handleExemptionUsed}
            />
          </>
        )}
        <TodayFeed refreshKey={refreshKey} currentUserId={user.id} currentUserName={user.name} currentUserAvatarUrl={user.avatar_url} />
        <Leaderboard refreshKey={refreshKey} />
        <SealFeed refreshKey={refreshKey} />
      </div>

      {/* 물개 탭 — 처음 방문 후 유지 */}
      {visitedTabs.has("seal") && (
        <div className={activeTab === "seal" ? "" : "hidden"}>
          <SealCard userId={user.id} customDeadlineTime={user.custom_deadline_time} />
        </div>
      )}

      {/* 벌금통 탭 */}
      {visitedTabs.has("fund") && (
        <div className={activeTab === "fund" ? "" : "hidden"}>
          <PenaltyFund userId={user.id} userName={user.name} />
        </div>
      )}

      {/* 현황 탭 */}
      {visitedTabs.has("members") && (
        <div className={activeTab === "members" ? "" : "hidden"}>
          <MemberBoard refreshKey={refreshKey} />
        </div>
      )}

      {/* MY 탭 */}
      {visitedTabs.has("my") && (
        <div className={activeTab === "my" ? "" : "hidden"}>
          <ProfileCard
            user={user}
            onUpdate={(updated) => {
              setUser(updated);
            }}
          />
        </div>
      )}

      {/* 캘린더 탭 */}
      {visitedTabs.has("calendar") && (
        <div className={activeTab === "calendar" ? "space-y-5" : "hidden"}>
          <AttendanceCalendar userId={user.id} />
          <ExemptionCard
            userId={user.id}
            hasCheckedInToday={!!todayCheckin}
            onExemptionUsed={handleExemptionUsed}
          />
        </div>
      )}
      <FloatingChat userId={user.id} userName={user.name} />
    </main>
  );
}
