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
      <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg shrink-0">
        {log.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-relaxed">{log.content}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
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
        <div className="text-center text-gray-400 text-sm py-4">
          뭉치 소식 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🦭</span>
        <h2 className="font-bold text-gray-900">뭉치 소식</h2>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-xl">
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
