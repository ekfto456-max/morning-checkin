"use client";

import { useState } from "react";

type User = { id: string; name: string };

export default function LoginForm({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) throw new Error("로그인 실패");

      const user = await res.json();
      localStorage.setItem("checkin_user", JSON.stringify(user));
      onLogin(user);
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 & 마스코트 */}
        <div className="text-center space-y-4">
          <p className="text-5xl">{"\uD83D\uDC80"}</p>
          <div>
            <h1 className="text-2xl font-bold">{"\uC8FD\uAE30\uC2A4"}</h1>
            <p className="text-sm text-zinc-500">
              {"\uC8FD\uC74C\uC758 \uAE30\uC0C1\uC2A4\uD130\uB514"}
            </p>
          </div>

          {/* 면제권 마스코트 이미지 */}
          <div className="flex justify-center">
            <img
              src="/mascot.jpg"
              alt={"\uBA74\uC81C\uAD8C"}
              className="w-32 h-32 rounded-2xl object-cover border-2 border-zinc-700"
            />
          </div>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={"\uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading
              ? "\uB85C\uADF8\uC778 \uC911..."
              : "\uC2DC\uC791\uD558\uAE30"}
          </button>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
