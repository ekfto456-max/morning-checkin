"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import UserProfileModal from "@/components/UserProfileModal";

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
};

type Props = {
  userId: string;
  userName: string;
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function FloatingChat({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [profileModal, setProfileModal] = useState<{ userId: string; userName: string } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const data: Message[] = await res.json();
      setMessages(data);
      if (!open) {
        setUnread((prev) => {
          const newCount = data.length - lastSeenCount;
          return newCount > 0 ? newCount : prev;
        });
      }
    } catch {
      // silently fail
    }
  }, [open, lastSeenCount]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (open) {
      setLastSeenCount(messages.length);
      setUnread(0);
      // 처음 열 때는 smooth 없이 즉시 바닥으로 (깜빡임 방지)
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open]);

  // 모바일 키보드 높이 추적 (visualViewport API)
  useEffect(() => {
    if (!open) {
      setKeyboardHeight(0);
      return;
    }
    const vv = (typeof window !== "undefined" && window.visualViewport) || null;
    if (!vv) return;
    const handleResize = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardHeight(diff > 100 ? diff : 0);
    };
    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    handleResize();
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, [open]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, content: text }),
      });
      await fetchMessages();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)", boxShadow: "0 4px 20px rgba(255,71,87,0.4)" }}
        aria-label="채팅 열기"
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* 배경 오버레이 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Slide-up Chat Panel - 하프 시트 스타일 */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "#ffffff",
          height: keyboardHeight > 0 ? `calc(85dvh - ${keyboardHeight}px)` : "75dvh",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
          transition: "transform 280ms cubic-bezier(0.32, 0.72, 0, 1), height 200ms ease-out",
          willChange: "transform, height",
          paddingBottom: keyboardHeight > 0 ? 0 : "env(safe-area-inset-bottom)",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="font-bold text-gray-900">죽기스 채팅</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesRef}
          className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-8">
              아직 메시지가 없어요. 첫 메시지를 남겨보세요!
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}
              >
                {!isMe && (
                  <button
                    onClick={() => setProfileModal({ userId: msg.user_id, userName: msg.user_name })}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0 mt-1 active:opacity-70 transition-opacity"
                  >
                    {msg.user_name.charAt(0)}
                  </button>
                )}
                <div
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}
                >
                  {!isMe && (
                    <button
                      onClick={() => setProfileModal({ userId: msg.user_id, userName: msg.user_name })}
                      className="text-xs text-gray-500 mb-1 ml-1 hover:text-gray-700 active:opacity-70 transition-opacity"
                    >
                      {msg.user_name}
                    </button>
                  )}
                  <div className="flex items-end gap-1">
                    {isMe && (
                      <span className="text-xs text-gray-400 mb-0.5">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? "text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                      }`}
                      style={isMe ? { background: "linear-gradient(135deg, #FF4757, #C0392B)" } : {}}
                    >
                      {msg.content}
                    </div>
                    {!isMe && (
                      <span className="text-xs text-gray-400 mb-0.5">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div
          className="border-t border-gray-100 bg-white px-3 py-3 flex items-center gap-2"
          style={{ paddingBottom: keyboardHeight > 0 ? "12px" : "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            maxLength={500}
            enterKeyHint="send"
            className="flex-1 bg-gray-50 text-gray-800 rounded-full px-4 py-2.5 outline-none placeholder-gray-400 border border-gray-200 focus:border-red-300 transition-colors"
            style={{ fontSize: "16px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full text-white text-lg flex items-center justify-center disabled:opacity-40 transition-all shrink-0 active:scale-95"
            style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
            aria-label="전송"
          >
            ➤
          </button>
        </div>
      </div>
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          userName={profileModal.userName}
          onClose={() => setProfileModal(null)}
        />
      )}
    </>
  );
}
