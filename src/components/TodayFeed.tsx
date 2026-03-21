"use client";

import { useState, useEffect, useRef } from "react";

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

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
};

const QUICK_REACTIONS = ["👍", "ㅋㅋㅋ", "대박", "화이팅!", "😂", "🔥"];

function CommentSection({
  checkinId,
  currentUserId,
  currentUserName,
}: {
  checkinId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?checkin_id=${checkinId}`);
      if (res.ok) setComments(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchComments();
  }, [open]);

  const postComment = async (content: string) => {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin_id: checkinId, user_id: currentUserId, content }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    await postComment(input.trim());
    setInput("");
    setSubmitting(false);
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h < 12 ? "오전" : "오후"} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m}`;
  };

  return (
    <div className="mt-2 border-t border-zinc-700/40 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>💬</span>
        <span>
          {!open && comments.length === 0 ? "댓글 달기"
            : !open ? `댓글 ${comments.length}개 보기`
            : "댓글 접기"}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* 댓글 목록 */}
          {loading ? (
            <p className="text-xs text-zinc-600 text-center py-1">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-1">첫 댓글을 달아봐요! 🦭</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs shrink-0 mt-0.5 font-medium">
                    {c.user_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-zinc-300">{c.user_name}</span>
                      <span className="text-[10px] text-zinc-600">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 break-words leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 빠른 반응 */}
          <div className="flex gap-1 flex-wrap">
            {QUICK_REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => postComment(r)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 rounded-full px-2.5 py-0.5 transition-all"
              >
                {r}
              </button>
            ))}
          </div>

          {/* 댓글 입력창 */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="댓글 입력..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className="text-xs bg-red-900/80 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-1.5 font-semibold transition-colors"
            >
              {submitting ? "..." : "전송"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function TodayFeed({
  refreshKey,
  currentUserId,
  currentUserName,
}: {
  refreshKey: number;
  currentUserId?: string;
  currentUserName?: string;
}) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) setFeed(await res.json());
      } catch {
        // 조회 실패
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
    // 5초마다 자동 폴링
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
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
          <span>📸</span><span>오늘의 인증</span>
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
        <p className="text-zinc-500 text-center py-6">아직 아무도 인증하지 않았습니다 😴</p>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div key={item.id} className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium">
                    {item.type === "exemption" ? "🎫" : item.user_name.charAt(0)}
                  </div>
                  <span className="font-medium text-zinc-200">{item.user_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">{formatTime(item.checkin_time)}</span>
                  {item.type === "checkin" && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      item.status === "on_time"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-red-900/50 text-red-400"
                    }`}>
                      {item.status === "on_time" ? "정시" : `₩${(item.penalty || 0).toLocaleString()}`}
                    </span>
                  )}
                </div>
              </div>

              {/* 인증샷 */}
              {item.type === "checkin" && item.image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img src={item.image_url} alt="인증샷" className="w-full h-48 object-cover" />
                  <div className="bg-black/70 px-3 py-1.5 text-xs text-zinc-300">
                    {new Date(item.checkin_time).toLocaleString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric",
                      weekday: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              )}

              {/* 면제권 */}
              {item.type === "exemption" && (
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 text-center">
                  <p className="text-3xl mb-1">🎫</p>
                  <p className="text-yellow-400 font-semibold">면제권 사용</p>
                  {item.reason && <p className="text-zinc-400 text-xs mt-1">{item.reason}</p>}
                </div>
              )}

              {/* 댓글 */}
              {item.type === "checkin" && currentUserId && currentUserName && (
                <CommentSection
                  checkinId={item.id}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
