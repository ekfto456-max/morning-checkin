"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

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
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 shadow-lg flex items-center justify-center text-2xl hover:bg-zinc-700 transition-colors"
        aria-label="채팅 열기"
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Slide-up Chat Panel */}
      <div
        className={`fixed inset-0 z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ background: "#18181b" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="font-semibold text-white">죽기스 채팅</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-white text-2xl leading-none transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-zinc-600 text-sm mt-8">
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
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0 mt-1">
                    {msg.user_name.charAt(0)}
                  </div>
                )}
                <div
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}
                >
                  {!isMe && (
                    <span className="text-xs text-zinc-500 mb-1 ml-1">
                      {msg.user_name}
                    </span>
                  )}
                  <div className="flex items-end gap-1">
                    {isMe && (
                      <span className="text-xs text-zinc-600 mb-0.5">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? "bg-red-600 text-white rounded-br-sm"
                          : "bg-zinc-700 text-zinc-100 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {!isMe && (
                      <span className="text-xs text-zinc-600 mb-0.5">
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
        <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            maxLength={500}
            className="flex-1 bg-zinc-800 text-white text-sm rounded-full px-4 py-2 outline-none placeholder-zinc-500 border border-zinc-700 focus:border-zinc-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-red-600 text-white text-lg flex items-center justify-center disabled:opacity-40 hover:bg-red-500 transition-colors shrink-0"
            aria-label="전송"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
