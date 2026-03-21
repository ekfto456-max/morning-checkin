"use client";

import { useState, useEffect, useRef } from "react";
import UserProfileModal from "@/components/UserProfileModal";

type FeedItem = {
  id: string;
  user_id: string;
  user_name: string;
  checkin_time: string;
  image_url?: string;
  status?: string;
  penalty?: number;
  type: "checkin" | "exemption" | "post";
  reason?: string;
  content?: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
};

const EMOJI_REACTIONS = ["👍", "❤️", "🔥", "😂"];
const QUICK_COMMENTS = ["ㅋㅋㅋ", "대박", "화이팅!", "오늘도 최고!"];

// 이모지 반응 바
function ReactionBar({
  checkinId,
  currentUserId,
}: {
  checkinId: string;
  currentUserId: string;
}) {
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/reactions?checkin_id=${checkinId}`)
      .then((r) => r.json())
      .then((d) => setReactions(d || {}))
      .catch(() => {});
  }, [checkinId]);

  const toggle = async (emoji: string) => {
    if (loading) return;
    setLoading(true);
    const myReactions = reactions[emoji] || [];
    const alreadyReacted = myReactions.includes(currentUserId);

    // 낙관적 업데이트
    setReactions((prev) => {
      const next = { ...prev };
      if (alreadyReacted) {
        next[emoji] = (next[emoji] || []).filter((id) => id !== currentUserId);
        if (next[emoji].length === 0) delete next[emoji];
      } else {
        next[emoji] = [...(next[emoji] || []), currentUserId];
      }
      return next;
    });

    await fetch("/api/reactions", {
      method: alreadyReacted ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin_id: checkinId, user_id: currentUserId, emoji }),
    });
    setLoading(false);
  };

  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {EMOJI_REACTIONS.map((emoji) => {
        const users = reactions[emoji] || [];
        const reacted = users.includes(currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all active:scale-95 border ${
              reacted
                ? "bg-red-50 border-red-200 text-red-500 font-semibold"
                : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <span>{emoji}</span>
            {users.length > 0 && (
              <span className="text-xs font-bold">{users.length}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-1">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">첫 댓글을 달아봐요! 🦭</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs shrink-0 mt-0.5 font-semibold text-gray-600">
                    {c.user_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-gray-700">{c.user_name}</span>
                      <span className="text-[10px] text-gray-400">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-600 break-words leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 빠른 댓글 */}
          <div className="flex gap-1 flex-wrap">
            {QUICK_COMMENTS.map((r) => (
              <button
                key={r}
                onClick={() => postComment(r)}
                className="text-xs bg-gray-100 hover:bg-gray-200 active:scale-95 border border-gray-200 rounded-full px-2.5 py-0.5 transition-all text-gray-600"
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
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-red-300 transition-colors"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className="text-xs bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-1.5 font-semibold transition-colors"
            >
              {submitting ? "..." : "전송"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function PostComposer({
  currentUserId,
  currentUserName,
  onPosted,
}: {
  currentUserId: string;
  currentUserName: string;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("user_id", currentUserId);
      formData.append("content", text.trim());
      if (image) formData.append("image", image);

      const res = await fetch("/api/posts", { method: "POST", body: formData });
      if (res.ok) {
        setText("");
        setImage(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        onPosted();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0 mt-0.5">
          {currentUserName.charAt(0)}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="오늘 하루 어떠세요? 수다 떨어요 💬"
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-red-300 resize-none transition-colors"
          rows={2}
          maxLength={300}
        />
      </div>
      {preview && (
        <div className="relative ml-10">
          <img src={preview} alt="미리보기" className="w-32 h-24 object-cover rounded-xl border border-gray-200" />
          <button
            onClick={() => { setImage(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center"
          >×</button>
        </div>
      )}
      <div className="flex items-center justify-between ml-10">
        <label className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
          <span>🖼️</span>
          <span>사진 첨부</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="text-xs font-semibold text-white px-4 py-1.5 rounded-xl disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
        >
          {submitting ? "..." : "게시"}
        </button>
      </div>
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
  const [profileModal, setProfileModal] = useState<{ userId: string; userName: string } | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

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
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, [refreshKey, localRefresh]);

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
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-gray-900">
          <span>📢</span><span>오늘의 피드</span>
        </h2>
        <p className="text-gray-400 text-center py-4 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
        <span>📢</span>
        <span>오늘의 피드</span>
        {feed.length > 0 && (
          <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full font-semibold">
            {feed.length}
          </span>
        )}
      </h2>

      {/* 글 작성 컴포저 */}
      {currentUserId && currentUserName && (
        <PostComposer
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onPosted={() => setLocalRefresh((n) => n + 1)}
        />
      )}

      {feed.length === 0 ? (
        <div className="bg-gray-50 rounded-xl py-8 text-center">
          <p className="text-2xl mb-2">✏️</p>
          <p className="text-gray-400 text-sm">첫 번째 피드를 남겨보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <button
                  className="flex items-center gap-2 active:opacity-70 transition-opacity"
                  onClick={() => setProfileModal({ userId: item.user_id, userName: item.user_name })}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {item.type === "exemption" ? "🎫" : item.user_name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-gray-800 leading-tight">{item.user_name}</span>
                    {item.type === "post" && (
                      <span className="text-[10px] text-gray-400 leading-tight">자유 게시글</span>
                    )}
                  </div>
                </button>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">{formatTime(item.checkin_time)}</span>
                  {item.type === "checkin" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.status === "on_time"
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-500 border border-red-200"
                    }`}>
                      {item.status === "on_time" ? "정시" : `₩${(item.penalty || 0).toLocaleString()}`}
                    </span>
                  )}
                </div>
              </div>

              {/* 자유 게시글 */}
              {item.type === "post" && (
                <>
                  {item.content && (
                    <p className="text-sm text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">{item.content}</p>
                  )}
                  {item.image_url && (
                    <div className="rounded-xl overflow-hidden mb-1">
                      <img src={item.image_url} alt="첨부 이미지" className="w-full max-h-64 object-cover" />
                    </div>
                  )}
                </>
              )}

              {/* 인증샷 */}
              {item.type === "checkin" && item.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img src={item.image_url} alt="인증샷" className="w-full h-48 object-cover" />
                  <div className="bg-black/60 px-3 py-1.5 text-xs text-white/80">
                    {new Date(item.checkin_time).toLocaleString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric",
                      weekday: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              )}

              {/* 면제권 */}
              {item.type === "exemption" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-3xl mb-1">🎫</p>
                  <p className="text-amber-600 font-semibold">면제권 사용</p>
                  {item.reason && <p className="text-gray-500 text-xs mt-1">{item.reason}</p>}
                </div>
              )}

              {/* 이모지 반응 */}
              {currentUserId && (
                <ReactionBar checkinId={item.id} currentUserId={currentUserId} />
              )}

              {/* 댓글 */}
              {currentUserId && currentUserName && (
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

      {/* 유저 프로필 모달 */}
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          userName={profileModal.userName}
          onClose={() => setProfileModal(null)}
        />
      )}
    </div>
  );
}
