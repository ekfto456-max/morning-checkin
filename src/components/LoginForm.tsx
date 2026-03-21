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
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installTab, setInstallTab] = useState<"iphone" | "galaxy">("iphone");

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

        {/* 앱 설치 가이드 토글 */}
        <div className="border border-zinc-700 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📲</span>
              <span>홈 화면에 앱으로 설치하기</span>
            </span>
            <span className="text-zinc-600">{showInstallGuide ? "▲" : "▼"}</span>
          </button>

          {showInstallGuide && (
            <div className="border-t border-zinc-700 px-4 py-4 space-y-3">
              {/* 탭 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInstallTab("iphone")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    installTab === "iphone"
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  🍎 아이폰
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab("galaxy")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    installTab === "galaxy"
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  🤖 갤럭시
                </button>
              </div>

              {installTab === "iphone" && (
                <div className="space-y-2">
                  <p className="text-xs text-yellow-400 font-medium">⚠️ Safari로 열어야 해요!</p>
                  {[
                    { step: "1", text: "Safari로 이 페이지 접속" },
                    { step: "2", text: "하단 가운데 공유 버튼 탭 (□↑)" },
                    { step: "3", text: "\"홈 화면에 추가\" 선택" },
                    { step: "4", text: "오른쪽 위 \"추가\" 탭" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {step}
                      </span>
                      <span className="text-sm text-zinc-300">{text}</span>
                    </div>
                  ))}
                </div>
              )}

              {installTab === "galaxy" && (
                <div className="space-y-2">
                  <p className="text-xs text-blue-400 font-medium">Chrome 브라우저로 접속하세요</p>
                  {[
                    { step: "1", text: "Chrome으로 이 페이지 접속" },
                    { step: "2", text: "우측 상단 ⋮ (점 세 개) 탭" },
                    { step: "3", text: "\"홈 화면에 추가\" 또는 \"앱 설치\" 선택" },
                    { step: "4", text: "\"추가\" 확인" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {step}
                      </span>
                      <span className="text-sm text-zinc-300">{text}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-zinc-600 text-center pt-1">
                설치 후에는 앱처럼 전체화면으로 실행돼요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
