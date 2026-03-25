"use client";

import { useState, useRef } from "react";

type Checkin = {
  id: string;
  status: string;
  penalty: number;
  checkin_time: string;
  image_url: string;
};

export default function CheckinUpload({
  userId,
  onCheckin,
}: {
  userId: string;
  onCheckin: (checkin: Checkin) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const getSelectedFile = (): File | null => {
    const cameraFile = cameraRef.current?.files?.[0];
    if (cameraFile) return cameraFile;
    const galleryFile = fileRef.current?.files?.[0];
    if (galleryFile) return galleryFile;
    return null;
  };

  const handleUpload = async () => {
    const file = getSelectedFile();
    if (!file) {
      setError("이미지를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("image", file);

      const res = await fetch("/api/checkin", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("오늘 이미 출석했습니다!");
        if (data.checkin) onCheckin(data.checkin);
        return;
      }

      if (!res.ok) throw new Error(data.error || "출석 실패");

      onCheckin(data);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "출석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 주말 + 새벽 5시 이전 체크 (KST 기준)
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const dayOfWeek = nowKST.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isBefore5am = nowKST.getUTCHours() < 5;
  const isBlocked = isWeekend || isBefore5am;
  const dayName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][dayOfWeek];

  const handleUploadOrBlocked = () => {
    if (isWeekend) { setError("weekend"); return; }
    if (isBefore5am) { setError("early"); return; }
    handleUpload();
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
        <span>📸</span>
        <span>출석 인증</span>
      </h2>

      <div className="space-y-3">
        {/* 카메라 / 갤러리 */}
        <div className="grid grid-cols-2 gap-3">
          <label
            className="flex items-center justify-center gap-2 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={isBlocked ? (e) => { e.preventDefault(); setError(isWeekend ? "weekend" : "early"); } : undefined}
          >
            <span>📷</span>
            <span className="text-sm font-semibold text-gray-700">카메라</span>
            {!isBlocked && (
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            )}
          </label>
          <label
            className="flex items-center justify-center gap-2 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={isBlocked ? (e) => { e.preventDefault(); setError(isWeekend ? "weekend" : "early"); } : undefined}
          >
            <span>🖼️</span>
            <span className="text-sm font-semibold text-gray-700">갤러리</span>
            {!isBlocked && (
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            )}
          </label>
        </div>

        {/* 미리보기 */}
        {preview && (
          <img
            src={preview}
            alt="미리보기"
            className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
          />
        )}

        {/* 출석하기 버튼 */}
        <button
          onClick={handleUploadOrBlocked}
          disabled={loading || (!preview && !isBlocked)}
          className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{
            background: (preview || isBlocked) && !loading
              ? "linear-gradient(135deg, #FF4757, #C0392B)"
              : undefined,
            backgroundColor: (!preview && !isBlocked) || loading ? "#e5e7eb" : undefined,
          }}
        >
          {loading ? "업로드 중..." : "출석하기 💀"}
        </button>
      </div>

      {/* 주말 안내 */}
      {error === "weekend" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center space-y-1.5">
          <p className="text-2xl">😴</p>
          <p className="font-semibold text-gray-700 text-sm">오늘은 {dayName}이에요</p>
          <p className="text-xs text-gray-400">주말에는 기상 출석이 없어요.<br />푹 쉬고 월요일에 만나요! 🦭</p>
        </div>
      )}

      {/* 새벽 5시 이전 안내 */}
      {error === "early" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center space-y-1.5">
          <p className="text-2xl">🌙</p>
          <p className="font-semibold text-gray-700 text-sm">아직 출석 시간이 아니에요</p>
          <p className="text-xs text-gray-400">오전 5시부터 출석 인증이 가능합니다</p>
        </div>
      )}

      {error && error !== "weekend" && error !== "early" && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
