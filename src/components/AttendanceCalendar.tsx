"use client";

import { useState, useEffect, useCallback } from "react";

type Checkin = {
  id: string;
  user_id: string;
  checkin_time: string;
  status: string;
  penalty: number;
};

type Exemption = {
  id: string;
  user_id: string;
  used_for_date: string;
};

type DayStatus = "on_time" | "late" | "exemption" | "missed" | "future" | "none";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AttendanceCalendar({ userId }: { userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?user_id=${userId}&month=${currentMonth}`
      );
      const data = await res.json();
      if (res.ok) {
        setCheckins(data.checkins || []);
        setExemptions(data.exemptions || []);
      }
    } catch {
      // 조회 실패
    } finally {
      setLoading(false);
    }
  }, [userId, currentMonth]);

  useEffect(() => {
    if (userId) {
      fetchCalendar();
    }
  }, [userId, fetchCalendar]);

  const [year, month] = currentMonth.split("-").map(Number);
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const getDayStatus = (day: number): DayStatus => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cellDate = new Date(year, month - 1, day);

    // 미래 날짜
    if (cellDate > today) {
      return "future";
    }

    // 면제권 사용 확인
    const hasExemption = exemptions.some((e) => e.used_for_date === dateStr);
    if (hasExemption) {
      return "exemption";
    }

    // 체크인 확인
    const dayStart = new Date(year, month - 1, day);
    const dayEnd = new Date(year, month - 1, day + 1);
    const checkin = checkins.find((c) => {
      const t = new Date(c.checkin_time);
      return t >= dayStart && t < dayEnd;
    });

    if (checkin) {
      return checkin.status === "on_time" ? "on_time" : "late";
    }

    // 오늘인 경우 아직 체크인 안한 상태 (10:04 전이면 아직 기회 있음)
    if (cellDate.getTime() === today.getTime()) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes < 10 * 60 + 4) {
        return "none"; // 아직 체크인 시간 전
      }
      return "missed";
    }

    // 과거 날짜이고 체크인 없음
    return "missed";
  };

  const getStatusEmoji = (status: DayStatus): string => {
    switch (status) {
      case "on_time":
        return "\u2705";
      case "late":
        return "\u26A0\uFE0F";
      case "exemption":
        return "\uD83C\uDFAB";
      case "missed":
        return "\u274C";
      default:
        return "";
    }
  };

  const isToday = (day: number): boolean => {
    const now = new Date();
    return (
      year === now.getFullYear() &&
      month === now.getMonth() + 1 &&
      day === now.getDate()
    );
  };

  const monthLabel = `${year}년 ${month}월`;

  // 캘린더 그리드 생성
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>{"\uD83D\uDCC5"}</span>
        <span>{"출석 캘린더"}</span>
      </h2>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          {"<"}
        </button>
        <span className="text-lg font-semibold text-gray-800">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          {">"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">{"로딩 중..."}</p>
      ) : (
        <>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`text-xs font-medium py-1 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const status = getDayStatus(day);
              const today = isToday(day);

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                    today
                      ? "ring-2 ring-red-400"
                      : ""
                  } ${
                    status === "missed"
                      ? "bg-red-50"
                      : status === "on_time"
                      ? "bg-green-50"
                      : status === "exemption"
                      ? "bg-amber-50"
                      : today
                      ? "bg-red-500"
                      : "bg-gray-100"
                  }`}
                >
                  <span
                    className={`font-medium ${
                      today && status === "none" ? "text-white" : today ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {day}
                  </span>
                  <span className="text-sm leading-none mt-0.5">
                    {getStatusEmoji(status)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>{"\u2705 정시"}</span>
            <span>{"\u26A0\uFE0F 지각"}</span>
            <span>{"\uD83C\uDFAB 면제"}</span>
            <span>{"\u274C 미출석"}</span>
          </div>
        </>
      )}
    </div>
  );
}
