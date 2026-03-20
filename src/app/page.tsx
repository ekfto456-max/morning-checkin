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

type User = { id: string; name: string; batch?: string; purpose?: string };
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
  const [activeTab, setActiveTab] = useState<"home" | "seal" | "calendar">("home");

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-4xl mb-4">💀</p>
          <p className="text-zinc-500">로딩 중...</p>
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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>💀</span>
            <span>죽기스</span>
          </h1>
          <p className="text-sm text-zinc-500">
            안녕하세요,{" "}
            <span className="font-medium text-zinc-300">{user.name}</span>님
            {user.batch && (
              <span className="text-zinc-600 ml-1">({user.batch})</span>
            )}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          로그아웃
        </button>
      </header>

      {/* 실시간 시계 + 마감 */}
      <div className="card text-center space-y-2">
        <div className="text-5xl font-mono font-bold tracking-wider">
          <span>{clock.h}</span>
          <span className="clock-colon">:</span>
          <span>{clock.m}</span>
          <span className="clock-colon">:</span>
          <span className="text-3xl text-zinc-500">{clock.s}</span>
        </div>
        <p className="text-sm text-zinc-500">
          마감:{" "}
          <span className="text-red-500 font-semibold">오전 10:04</span>
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex bg-zinc-800/50 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "home"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          🏠 홈
        </button>
        <button
          onClick={() => setActiveTab("seal")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "seal"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          🦭 물개
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "calendar"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          📅 캘린더
        </button>
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
          <TodayFeed refreshKey={refreshKey} />

          {/* 리더보드 */}
          <Leaderboard refreshKey={refreshKey} />
        </>
      ) : activeTab === "seal" ? (
        <>
          {/* 물개 카드 */}
          <SealCard userId={user.id} />
        </>
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
    </main>
  );
}
