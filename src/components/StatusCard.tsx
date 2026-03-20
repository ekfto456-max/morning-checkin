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
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>{"\uD83D\uDCCB"}</span>
        <span>{"\uC624\uB298\uC758 \uCD9C\uC11D"}</span>
      </h2>

      {checkin ? (
        <div className="space-y-3">
          {/* 상태 */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">{"\uC0C1\uD0DC"}</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                checkin.status === "on_time"
                  ? "bg-green-900/50 text-green-400 border border-green-800"
                  : "bg-red-900/50 text-red-400 border border-red-800"
              }`}
            >
              {checkin.status === "on_time" ? "\uC815\uC2DC" : "\uC9C0\uAC01"}
            </span>
          </div>

          {/* 체크인 시간 */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              {"\uCCB4\uD06C\uC778 \uC2DC\uAC04"}
            </span>
            <span className="font-mono text-zinc-200">
              {formatTime(checkin.checkin_time)}
            </span>
          </div>

          {/* 오늘 벌금 */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              {"\uC624\uB298 \uBC8C\uAE08"}
            </span>
            <span
              className={`font-bold text-lg ${
                checkin.penalty === 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {checkin.penalty.toLocaleString()}
              {"\uC6D0"}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-zinc-600 text-center py-4">
          {"\uC544\uC9C1 \uCD9C\uC11D\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4"}
        </p>
      )}

      {/* 누적 벌금 */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 font-medium">
            {"\uB204\uC801 \uBC8C\uAE08"}
          </span>
          <span
            className={`text-2xl font-bold ${
              totalPenalty === 0
                ? "text-green-400"
                : "text-red-500 penalty-glow"
            }`}
          >
            {totalPenalty.toLocaleString()}
            {"\uC6D0"}
          </span>
        </div>
      </div>
    </div>
  );
}
