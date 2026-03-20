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
    // 카메라 입력에서 먼저 확인
    const cameraFile = cameraRef.current?.files?.[0];
    if (cameraFile) return cameraFile;
    // 갤러리 입력 확인
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
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>{"\uD83D\uDCF8"}</span>
        <span>{"\uCD9C\uC11D \uC778\uC99D"}</span>
      </h2>

      <div className="space-y-3">
        {/* 카메라 촬영 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-center gap-2 py-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-700 transition-colors">
            <span>{"\uD83D\uDCF7"}</span>
            <span className="text-sm font-medium">
              {"\uCE74\uBA54\uB77C"}
            </span>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <label className="flex items-center justify-center gap-2 py-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-700 transition-colors">
            <span>{"\uD83D\uDDBC\uFE0F"}</span>
            <span className="text-sm font-medium">
              {"\uAC24\uB7EC\uB9AC"}
            </span>
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
            className="w-full max-h-48 object-cover rounded-xl border border-zinc-700"
          />
        )}

        {/* 출석하기 버튼 */}
        <button
          onClick={handleUpload}
          disabled={loading || !preview}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? "\uC5C5\uB85C\uB4DC \uC911..."
            : "\uCD9C\uC11D\uD558\uAE30"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
