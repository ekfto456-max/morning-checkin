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

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
        <span>📸</span>
        <span>출석 인증</span>
      </h2>

      <div className="space-y-3">
        {/* 카메라 / 갤러리 */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-center gap-2 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <span>📷</span>
            <span className="text-sm font-semibold text-gray-700">카메라</span>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <label className="flex items-center justify-center gap-2 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <span>🖼️</span>
            <span className="text-sm font-semibold text-gray-700">갤러리</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
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
          onClick={handleUpload}
          disabled={loading || !preview}
          className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{
            background: preview && !loading
              ? "linear-gradient(135deg, #FF4757, #C0392B)"
              : undefined,
            backgroundColor: (!preview || loading) ? "#e5e7eb" : undefined,
          }}
        >
          {loading ? "업로드 중..." : "출석하기 💀"}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
