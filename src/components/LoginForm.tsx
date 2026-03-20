"use client";

import { useState } from "react";

type User = { id: string; name: string; batch?: string; purpose?: string };

export default function LoginForm({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [batch, setBatch] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !batch.trim() || !purpose.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          batch: batch.trim(),
          purpose: purpose.trim(),
        }),
      });

      if (!res.ok) throw new Error("등록 실패");

      const user = await res.json();
      localStorage.setItem("checkin_user", JSON.stringify(user));
      onLogin(user);
    } catch {
      setError("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && batch.trim() && purpose.trim();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 & 마스코트 */}
        <div className="text-center space-y-4">
          <p className="text-5xl">💀</p>
          <div>
            <h1 className="text-2xl font-bold">죽기스</h1>
            <p className="text-sm text-zinc-500">죽음의 기상스터디</p>
          </div>

          {/* 면제권 마스코트 이미지 */}
          <div className="flex justify-center">
            <img
              src="/mascot.jpg"
              alt="면제권"
              className="w-32 h-32 rounded-2xl object-cover border-2 border-zinc-700"
            />
          </div>
        </div>

        {/* 최초 등록 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 ml-1">
              📋 몇 기인가요?
            </label>
            <input
              type="text"
              placeholder="예: 1기, 2기..."
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1 ml-1">
              👤 이름
            </label>
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1 ml-1">
              🎯 기상 목적
            </label>
            <input
              type="text"
              placeholder="예: 코딩 공부, 운동, 독서..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg mt-2"
          >
            {loading ? "등록 중..." : "시작하기 💀"}
          </button>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </form>

        <p className="text-center text-xs text-zinc-600">
          최초 1회만 등록하면 다음부터 자동 로그인됩니다
        </p>
      </div>
    </div>
  );
}
