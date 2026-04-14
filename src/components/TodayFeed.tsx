"use client";

import { useState, useEffect, useRef } from "react";
import UserProfileModal from "@/components/UserProfileModal";

type FeedItem = {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
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
  avatar_url?: string | null;
};

function Avatar({ src, name, size = "md" }: { src?: string | null; name: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const emojiSize = size === "sm" ? "text-sm" : "text-lg";
  const isUrl = src && (src.startsWith("http") || src.startsWith("/"));
  if (isUrl) {
    return <img src={src} alt={name} loading="lazy" className={`${sizeClass} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-600 shrink-0`}>
      {src ? <span className={emojiSize}>{src}</span> : name.charAt(0)}
    </div>
  );
}

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
    if (open) {
      fetchComments();
      // #8 댓글 자동 포커스
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const postComment = async (content: string) => {
    // 낙관적 업데이트: 즉시 UI에 추가
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempComment: Comment = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      user_name: currentUserName,
    };
    setComments((prev) => [...prev, tempComment]);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin_id: checkinId, user_id: currentUserId, content }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => prev.map((c) => (c.id === tempId ? newComment : c)));
    } else {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    const content = input.trim();
    setInput("");
    setSubmitting(true);
    await postComment(content);
    setSubmitting(false);
    // 전송 후 재포커스
    setTimeout(() => inputRef.current?.focus(), 50);
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
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
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
            <div className="space-y-2 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2.5 bg-gray-200 rounded w-16" />
                    <div className="h-2.5 bg-gray-200 rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">첫 댓글을 달아봐요! 🦭</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className={`flex gap-2 items-start ${c.id.startsWith("temp-") ? "opacity-60" : ""}`}>
                  <div className="mt-0.5">
                    <Avatar src={c.avatar_url} name={c.user_name} size="sm" />
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
              className="text-xs bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-1.5 font-semibold transition-all active:scale-95 duration-75"
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
  currentUserAvatarUrl,
  onPosted,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  onPosted: (newPost: FeedItem) => void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
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
    setPostError(null);
    try {
      const formData = new FormData();
      formData.append("user_id", currentUserId);
      formData.append("content", text.trim());
      if (image) formData.append("image", image);

      const res = await fetch("/api/posts", { method: "POST", body: formData });
      if (res.ok) {
        const newPost = await res.json();
        setText("");
        setImage(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        // 서버에서 받은 데이터로 낙관적 피드 업데이트
        onPosted({
          id: newPost.id,
          user_id: newPost.user_id,
          user_name: newPost.user_name || currentUserName,
          avatar_url: currentUserAvatarUrl || null,
          checkin_time: newPost.created_at,
          content: newPost.content,
          image_url: newPost.image_url,
          type: "post",
        });
      } else {
        const body = await res.json().catch(() => ({}));
        setPostError(`게시 실패 (${res.status}): ${body.error || "알 수 없는 오류"}`);
      }
    } catch (e) {
      setPostError("네트워크 오류가 발생했어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <div className="mt-0.5">
          <Avatar src={currentUserAvatarUrl} name={currentUserName} />
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
          <img src={preview} alt="미리보기" loading="lazy" className="w-32 h-24 object-cover rounded-xl border border-gray-200" />
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
          className="text-xs font-semibold text-white px-4 py-1.5 rounded-xl disabled:opacity-40 transition-all active:scale-95 duration-75"
          style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
        >
          {submitting ? "..." : "게시"}
        </button>
      </div>
      {postError && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2 ml-10">{postError}</p>
      )}
    </div>
  );
}

export default function TodayFeed({
  refreshKey,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  optimisticItem,
  onOptimisticConsumed,
}: {
  refreshKey: number;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatarUrl?: string | null;
  optimisticItem?: Record<string, unknown> | null;
  onOptimisticConsumed?: () => void;
}) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState<{ userId: string; userName: string } | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // 최근 낙관적으로 추가된 아이템 ID와 타임스탬프 (fetch로 덮어쓸 때 보존)
  const pendingOptimisticRef = useRef<Map<string, number>>(new Map());
  const OPTIMISTIC_WINDOW_MS = 15000; // 15초간 보존

  // 낙관적 아이템 즉시 피드에 추가
  useEffect(() => {
    if (optimisticItem && page === 1) {
      const newItem = optimisticItem as unknown as FeedItem;
      pendingOptimisticRef.current.set(newItem.id, Date.now());
      setFeed((prev) => {
        if (prev.some((item) => item.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
      onOptimisticConsumed?.();
    }
  }, [optimisticItem]);

  // 게시글 낙관적 추가 (PostComposer에서 호출)
  const addOptimisticPost = (newPost: FeedItem) => {
    pendingOptimisticRef.current.set(newPost.id, Date.now());
    setFeed((prev) => {
      if (prev.some((item) => item.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUserId || deletingId) return;
    setDeletingId(postId);
    const res = await fetch(`/api/posts?id=${postId}&user_id=${currentUserId}`, { method: "DELETE" });
    if (res.ok) {
      setFeed((prev) => prev.filter((item) => item.id !== postId));
    } else {
      const body = await res.json().catch(() => ({}));
      alert(`삭제 실패: ${body.error || res.status}`);
    }
    setDeletingId(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchFeed = async () => {
      try {
        const res = await fetch(`/api/feed?page=${page}`, { signal });
        if (!res.ok || signal.aborted) return;
        const data = await res.json();
        if (signal.aborted) return;

        // pendingOptimisticRef 정리는 setFeed 밖에서 수행 (side-effect 분리)
        const now = Date.now();
        const freshIds = new Set<string>(data.items.map((i: FeedItem) => i.id));
        pendingOptimisticRef.current.forEach((ts, id) => {
          if (freshIds.has(id) || now - ts > OPTIMISTIC_WINDOW_MS) {
            pendingOptimisticRef.current.delete(id);
          }
        });
        const idsToPreserve = new Set(pendingOptimisticRef.current.keys());

        setFeed((prev) => {
          // 보존할 낙관적 아이템 (아직 서버에 안 보이는 것들)
          const kept = prev.filter(
            (item) =>
              idsToPreserve.has(item.id) &&
              !freshIds.has(item.id)
          );
          const merged = [...kept, ...data.items];
          // checkin_time 내림차순 정렬
          return merged.sort(
            (a, b) =>
              new Date(b.checkin_time).getTime() -
              new Date(a.checkin_time).getTime()
          );
        });
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch {
        if (signal.aborted) return;
        // 조회 실패
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchFeed();

    // 백그라운드 폴링 중단 — Page Visibility API (1페이지만)
    if (page !== 1) {
      return () => controller.abort();
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(fetchFeed, 10000);
    };
    const stopPolling = () => { if (interval) { clearInterval(interval); interval = null; } };
    const handleVisibilityChange = () => {
      if (document.hidden) stopPolling();
      else { fetchFeed(); startPolling(); }
    };
    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      controller.abort();
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshKey, localRefresh, page]);

  const goToPage = (p: number) => {
    setPage(p);
    setLoading(true);
    // 카드 상단으로 스크롤
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const formatDateTime = (time: string) => {
    const d = new Date(time);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    if (isToday) return `${ampm} ${h12}:${m}`;
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    return `${mo}/${day} ${ampm} ${h12}:${m}`;
  };

  // 페이지 번호 배열 생성 (최대 5개 표시)
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="card space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span>📢</span><span>피드</span>
        </h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-2.5 bg-gray-200 rounded w-14" />
              </div>
              <div className="h-2.5 bg-gray-200 rounded w-12" />
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-7 w-10 bg-gray-200 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={cardRef} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span>📢</span>
          <span>피드</span>
          {total > 0 && (
            <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full font-semibold">
              총 {total}
            </span>
          )}
        </h2>
        {totalPages > 1 && (
          <span className="text-xs text-gray-400">{page} / {totalPages} 페이지</span>
        )}
      </div>

      {/* 글 작성 컴포저 — 1페이지에만 표시 */}
      {page === 1 && currentUserId && currentUserName && (
        <PostComposer
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          onPosted={(newPost) => {
            // 낙관적으로 즉시 피드 상단에 추가
            addOptimisticPost(newPost);
            // 백그라운드에서 서버와 동기화 (total 등 업데이트)
            setLocalRefresh((n) => n + 1);
          }}
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
                  <Avatar src={item.avatar_url} name={item.type === "exemption" ? "🎫" : item.user_name} />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-gray-800 leading-tight">{item.user_name}</span>
                    {item.type === "post" && (
                      <span className="text-[10px] text-gray-400 leading-tight">자유 게시글</span>
                    )}
                  </div>
                </button>
                <div className="text-right flex items-center gap-1.5">
                  {item.type === "post" && item.user_id === currentUserId && (
                    <button
                      onClick={() => handleDeletePost(item.id)}
                      disabled={deletingId === item.id}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1 disabled:opacity-40"
                      title="삭제"
                    >
                      {deletingId === item.id ? "⏳" : "🗑️"}
                    </button>
                  )}
                  <span className="text-xs text-gray-400">{formatDateTime(item.checkin_time)}</span>
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
                      <img src={item.image_url} alt="첨부 이미지" loading="lazy" className="w-full max-h-64 object-cover" />
                    </div>
                  )}
                </>
              )}

              {/* 인증샷 */}
              {item.type === "checkin" && item.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img src={item.image_url} alt="인증샷" loading="lazy" className="w-full h-48 object-cover" />
                  <div className="bg-black/60 px-3 py-1.5 text-xs text-white/80">
                    {new Date(item.checkin_time).toLocaleString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric",
                      weekday: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              )}

              {/* 사진 없는 체크인 안내 */}
              {item.type === "checkin" && !item.image_url && (
                <p className="text-xs text-gray-400 italic mb-1">📷 인증샷 없이 출석</p>
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

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      page === p
                        ? "text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    style={page === p ? { background: "linear-gradient(135deg, #FF4757, #C0392B)" } : {}}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          )}
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
