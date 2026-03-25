"use client";

import { useEffect, useState } from "react";
import UserProfileModal from "@/components/UserProfileModal";

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
  sealInteractions: number;
};

function formatTime(isoTime: string | null): string {
  if (!isoTime) return "";
  const d = new Date(new Date(isoTime).getTime() + 9 * 3600 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="text-gray-400 text-xs font-medium">미출석</span>
        </div>
      );
  }
}

export default function MemberBoard({ refreshKey }: { refreshKey: number }) {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState<{ userId: string; userName: string } | null>(null);

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
        <span className="text-xs text-gray-400 font-normal ml-1">
          오늘의 출석 상태
        </span>
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 bg-gray-200 rounded w-16" />
                <div className="h-5 w-5 bg-gray-200 rounded-full" />
              </div>
              <div className="h-2.5 bg-gray-200 rounded w-12" />
              <div className="h-2.5 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-gray-400 text-center py-4">등록된 멤버가 없습니다</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              onClick={() => setProfileModal({ userId: member.id, userName: member.name })}
              className={`rounded-xl px-3 py-2.5 border cursor-pointer active:scale-95 transition-transform ${
                member.todayStatus === "on_time"
                  ? "bg-green-50 border-green-200"
                  : member.todayStatus === "late"
                    ? "bg-red-50 border-red-200"
                    : member.todayStatus === "exemption"
                      ? "bg-purple-50 border-purple-200"
                      : "bg-gray-50 border-gray-200"
              }`}
            >
              {/* 이름 + 상태 아이콘 */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-sm text-gray-800">
                  {statusIcon(member.todayStatus)} {member.name}
                </span>
              </div>

              {/* 출석 상태 뱃지 */}
              <StatusBadge member={member} />

              {/* 면제권 + 누적벌금 */}
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="text-gray-400">
                  면제권 {member.remainingExemptions}장
                </span>
                <span
                  className={
                    member.totalPenalty > 0
                      ? "text-red-500"
                      : "text-gray-400"
                  }
                >
                  {member.totalPenalty > 0
                    ? `${member.totalPenalty.toLocaleString()}원`
                    : "0원"}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                🦭 뭉치 놀아주기 {member.sealInteractions}회
              </div>
            </div>
          ))}
        </div>
      )}

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
