"use client";

import { useEffect, useState } from "react";

type MemberStatus = {
  id: string;
  name: string;
  batch: string;
  todayStatus: "on_time" | "late" | "exemption" | "absent";
  checkinTime: string | null;
  todayPenalty: number;
  totalPenalty: number;
  remainingExemptions: number;
  exemptionReason: string | null;
};

function formatTime(isoTime: string | null): string {
  if (!isoTime) return "";
  const d = new Date(isoTime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function StatusBadge({ member }: { member: MemberStatus }) {
  switch (member.todayStatus) {
    case "on_time":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="text-green-400 text-xs font-medium">
            {formatTime(member.checkinTime)}
          </span>
        </div>
      );
    case "late":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="text-red-400 text-xs font-medium">
            {formatTime(member.checkinTime)}
          </span>
          <span className="text-red-400/70 text-[10px]">
            +{member.todayPenalty.toLocaleString()}원
          </span>
        </div>
      );
    case "exemption":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
          <span className="text-purple-400 text-xs font-medium">면제권 사용</span>
        </div>
      );
    case "absent":
    default:
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
          <span className="text-zinc-500 text-xs font-medium">미출석</span>
        </div>
      );
  }
}

export default function MemberBoard({ refreshKey }: { refreshKey: number }) {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members-status");
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [refreshKey]);

  const statusIcon = (status: MemberStatus["todayStatus"]) => {
    switch (status) {
      case "on_time":
        return "\u2705";
      case "late":
        return "\u23F0";
      case "exemption":
        return "\uD83C\uDFAB";
      case "absent":
      default:
        return "\u274C";
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>{"\uD83D\uDC65"}</span>
        <span>멤버 현황</span>
        <span className="text-xs text-zinc-500 font-normal ml-1">
          오늘의 출석 상태
        </span>
      </h2>

      {loading ? (
        <p className="text-zinc-600 text-center py-4">로딩 중...</p>
      ) : members.length === 0 ? (
        <p className="text-zinc-600 text-center py-4">등록된 멤버가 없습니다</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={`rounded-xl px-3 py-2.5 border ${
                member.todayStatus === "on_time"
                  ? "bg-green-900/10 border-green-800/20"
                  : member.todayStatus === "late"
                    ? "bg-red-900/10 border-red-800/20"
                    : member.todayStatus === "exemption"
                      ? "bg-purple-900/10 border-purple-800/20"
                      : "bg-zinc-800/50 border-zinc-700/30"
              }`}
            >
              {/* 이름 + 상태 아이콘 */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-sm text-zinc-200">
                  {statusIcon(member.todayStatus)} {member.name}
                </span>
              </div>

              {/* 출석 상태 뱃지 */}
              <StatusBadge member={member} />

              {/* 면제권 + 누적벌금 */}
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="text-zinc-500">
                  면제권 {member.remainingExemptions}장
                </span>
                <span
                  className={
                    member.totalPenalty > 0
                      ? "text-red-400/70"
                      : "text-zinc-500"
                  }
                >
                  {member.totalPenalty > 0
                    ? `${member.totalPenalty.toLocaleString()}원`
                    : "0원"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
