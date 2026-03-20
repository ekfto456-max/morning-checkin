"use client";

import { useState, useEffect } from "react";

type FeedItem = {
  id: string;
  user_id: string;
  user_name: string;
  checkin_time: string;
  image_url?: string;
  status?: string;
  penalty?: number;
  type: "checkin" | "exemption";
  reason?: string;
};

export default function TodayFeed({ refreshKey }: { refreshKey: number }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json();
          setFeed(data);
        }
      } catch {
        // 조회 실패
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [refreshKey]);

  const formatTime = (time: string) => {
    const d = new Date(time);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${ampm} ${h12}:${m}`;
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <span>📸</span>
          <span>오늘의 인증</span>
        </h2>
        <p className="text-zinc-500 text-center py-4">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>📸</span>
        <span>오늘의 인증</span>
        {feed.length > 0 && (
          <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded-full text-zinc-300">
            {feed.length}명
          </span>
        )}
      </h2>

      {feed.length === 0 ? (
        <p className="text-zinc-500 text-center py-6">
          아직 아무도 인증하지 않았습니다 😴
        </p>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50"
            >
              {/* 헤더: 이름 + 시간 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                    {item.type === "exemption" ? "🎫" : "👤"}
                  </div>
                  <span className="font-medium text-zinc-200">
                    {item.user_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">
                    {formatTime(item.checkin_time)}
                  </span>
                  {item.type === "checkin" && (
                    <span
                      className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        item.status === "on_time"
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {item.status === "on_time" ? "정시" : `₩${(item.penalty || 0).toLocaleString()}`}
                    </span>
                  )}
                </div>
              </div>

              {/* 내용 */}
              {item.type === "checkin" && item.image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={item.image_url}
                    alt="인증샷"
                    className="w-full h-48 object-cover"
                  />
                  {/* 타임스탬프 오버레이 */}
                  <div className="bg-black/70 px-3 py-1.5 text-xs text-zinc-300">
                    {new Date(item.checkin_time).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}

              {item.type === "exemption" && (
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 text-center">
                  <p className="text-3xl mb-1">🎫</p>
                  <p className="text-yellow-400 font-semibold">면제권 사용</p>
                  {item.reason && (
                    <p className="text-zinc-400 text-xs mt-1">{item.reason}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
