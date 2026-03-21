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

type User = { id: string; name: string; batch?: string; purpose?: string; avatar_url?: string };
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
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    const s = date.getSeconds().toString().padStart(2, "0");
    return { h, m, s };
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
            {user.batch && (
              <span className="text-gray-400 ml-1">({user.batch})</span>
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
      <div
        className="rounded-2xl p-6 text-center space-y-2"
        style={{
          background: "linear-gradient(135deg, #FF4757 0%, #C0392B 100%)",
          boxShadow: "0 8px 32px rgba(255, 71, 87, 0.28)",
        }}
      >
        <div className="text-5xl font-mono font-bold tracking-wider text-white">
          <span>{clock.h}</span>
          <span className="clock-colon" style={{ opacity: 0.6 }}>:</span>
          <span>{clock.m}</span>
          <span className="clock-colon" style={{ opacity: 0.6 }}>:</span>
          <span className="text-3xl" style={{ opacity: 0.5 }}>{clock.s}</span>
        </div>
        <p className="text-sm text-white/70">
          마감{" "}
          <span className="text-white font-bold">오전 10:03</span>
          {" "}까지 출석하세요
        </p>
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
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {activeTab === "home" ? (
        <>
          {/* 오늘의 상태 */}
          <StatusCard checkin={todayCheckin} totalPenalty={totalPenalty} />

          {/* 출석 인증 or 면제권 (아직 안 했으면) */}
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

          {/* 오늘의 인증 피드 (단톡방처럼) */}
          <TodayFeed refreshKey={refreshKey} currentUserId={user.id} currentUserName={user.name} currentUserAvatarUrl={user.avatar_url} />

          {/* 리더보드 */}
          <Leaderboard refreshKey={refreshKey} />

          {/* 물개 피드 */}
          <SealFeed refreshKey={refreshKey} />
        </>
      ) : activeTab === "seal" ? (
        <>
          {/* 물개 카드 */}
          <SealCard userId={user.id} />
        </>
      ) : activeTab === "fund" ? (
        <PenaltyFund userId={user.id} userName={user.name} />
      ) : activeTab === "members" ? (
        <MemberBoard refreshKey={refreshKey} />
      ) : activeTab === "my" ? (
        <ProfileCard
          user={user}
          onUpdate={(updated) => {
            setUser(updated);
          }}
        />
      ) : (
        <>
          {/* 출석 캘린더 */}
          <AttendanceCalendar userId={user.id} />

          {/* 면제권 현황 */}
          <ExemptionCard
            userId={user.id}
            hasCheckedInToday={!!todayCheckin}
            onExemptionUsed={handleExemptionUsed}
          />
        </>
      )}
      <FloatingChat userId={user.id} userName={user.name} />
    </main>
  );
}
