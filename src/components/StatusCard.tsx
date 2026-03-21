"use client";

type Checkin = {
  status: string;
  penalty: number;
  checkin_time: string;
  image_url: string;
};

export default function StatusCard({
  checkin,
  totalPenalty,
}: {
  checkin: Checkin | null;
  totalPenalty: number;
}) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
        <span>📋</span>
        <span>오늘의 출석</span>
      </h2>

      {checkin ? (
        <div className="space-y-3">
          {/* 상태 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">상태</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                checkin.status === "on_time"
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-red-50 text-red-500 border border-red-200"
              }`}
            >
              {checkin.status === "on_time" ? "✅ 정시" : "⏰ 지각"}
            </span>
          </div>

          {/* 체크인 시간 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">체크인 시간</span>
            <span className="font-mono font-semibold text-gray-800">
              {formatTime(checkin.checkin_time)}
            </span>
          </div>

          {/* 오늘 벌금 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">오늘 벌금</span>
            <span
              className={`font-bold text-lg ${
                checkin.penalty === 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {checkin.penalty.toLocaleString()}원
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl py-6 text-center">
          <p className="text-gray-400 text-sm">아직 출석하지 않았습니다</p>
        </div>
      )}

      {/* 누적 벌금 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium text-sm">나의 누적 벌금</span>
          <span
            className={`text-2xl font-black ${
              totalPenalty === 0
                ? "text-green-500"
                : "text-red-500 penalty-glow"
            }`}
          >
            {totalPenalty.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
}
