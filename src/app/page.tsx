"use client";

import { useState, useEffect } from "react";
import LoginForm from "@/components/LoginForm";
import CheckinUpload from "@/components/CheckinUpload";
import StatusCard from "@/components/StatusCard";
import Leaderboard from "@/components/Leaderboard";

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
          <p className="text-4xl mb-4">{"\uD83D\uDC80"}</p>
          <p className="text-zinc-500">{"\uB85C\uB529 \uC911..."}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const clock = formatClock(currentTime);

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>{"\uD83D\uDC80"}</span>
            <span>{"\uC8FD\uAE30\uC2A4"}</span>
          </h1>
          <p className="text-sm text-zinc-500">
            {"\uC548\uB155\uD558\uC138\uC694, "}
            <span className="font-medium text-zinc-300">{user.name}</span>
            {"\uB2D8"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {"\uB85C\uADF8\uC544\uC6C3"}
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
          {"\uB9C8\uAC10: "}
          <span className="text-red-500 font-semibold">
            {"\uC624\uC804 10:04"}
          </span>
        </p>
      </div>

      {/* 오늘의 상태 */}
      <StatusCard checkin={todayCheckin} totalPenalty={totalPenalty} />

      {/* 출석 인증 (아직 안 했으면) */}
      {!todayCheckin && (
        <CheckinUpload userId={user.id} onCheckin={handleCheckin} />
      )}

      {/* 리더보드 */}
      <Leaderboard refreshKey={refreshKey} />
    </main>
  );
}
