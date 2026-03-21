"use client";

import { useState, useEffect, useRef } from "react";

type SealLog = {
  id: string;
  type: string;
  content: string;
  emoji: string;
  created_at: string;
  user_id?: string;
};

type Props = {
  refreshKey: number;
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function LogItem({ log, index }: { log: SealLog; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shrink-0">
        {log.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-relaxed">{log.content}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(log.created_at)}</p>
      </div>
    </div>
  );
}

export default function SealFeed({ refreshKey }: Props) {
  const [logs, setLogs] = useState<SealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logKey, setLogKey] = useState(0);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/seal-logs");
      if (!res.ok) return;
      const data: SealLog[] = await res.json();
      setLogs(data);
      setLogKey((k) => k + 1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="text-center text-zinc-600 text-sm py-4">
          뭉치 소식 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🦭</span>
        <h2 className="font-semibold text-white">뭉치 소식</h2>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-6">
          아직 소식이 없어요. 출석하면 뭉치가 반응해요!
        </div>
      ) : (
        <div key={logKey} className="space-y-4">
          {logs.map((log, i) => (
            <LogItem key={log.id} log={log} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
