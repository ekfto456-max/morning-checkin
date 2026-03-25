"use client";

import { useState, useRef } from "react";
import NotificationToggle from "@/components/NotificationToggle";
import StatsCard from "@/components/StatsCard";

type User = { id: string; name: string; batch?: string; purpose?: string; avatar_url?: string };

const AVATAR_OPTIONS = [
  "🦭", "💀", "🐟", "🦁", "🐻", "🐼",
  "🐯", "🦊", "🐸", "🐙", "🦄", "🐧",
  "🐳", "🦋", "🌟", "🔥", "⚡", "🎯",
];

const AVATAR_STORAGE_KEY = "checkin_avatar";

export default function ProfileCard({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (updated: User) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [wakeTime, setWakeTime] = useState(user.batch || "");
  const [purpose, setPurpose] = useState(user.purpose || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string>(
    () => localStorage.getItem(AVATAR_STORAGE_KEY) || "🦭"
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url || null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, name, batch: wakeTime, purpose }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      localStorage.setItem("checkin_user", JSON.stringify(updated));
      onUpdate(updated);
      setEditing(false);
      setMessage("저장됐어요! ✅");
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("저장 실패. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (emoji: string) => {
    setAvatar(emoji);
    localStorage.setItem(AVATAR_STORAGE_KEY, emoji);
    setShowAvatarPicker(false);
    // DB에도 저장
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, avatar_url: emoji }),
      });
      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem("checkin_user", JSON.stringify(updated));
        onUpdate(updated);
      }
    } catch {
      // silently fail
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setShowAvatarPicker(false);
    }
  };

  const getSelectedPhoto = (): File | null => {
    return cameraRef.current?.files?.[0] || galleryRef.current?.files?.[0] || null;
  };

  const handlePhotoUpload = async () => {
    const file = getSelectedPhoto();
    if (!file) return;

    setPhotoUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("user_id", user.id);
      formData.append("image", file);

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newAvatarUrl = data.avatar_url;

      setAvatarUrl(newAvatarUrl);
      setPhotoPreview(null);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";

      const updatedUser = { ...user, avatar_url: newAvatarUrl };
      localStorage.setItem("checkin_user", JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setMessage("프로필 사진 저장됐어요! ✅");
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("사진 업로드 실패. 다시 시도해주세요.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl(null);
    setPhotoPreview(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, avatar_url: "" }),
      });
      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem("checkin_user", JSON.stringify(updated));
        onUpdate(updated);
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-4">
      {/* 프로필 헤더 카드 */}
      <div className="card space-y-4">
        {/* 아바타 + 이름 */}
        <div className="flex flex-col items-center gap-3 py-2">
          {/* 현재 프로필 이미지 */}
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="프로필 사진"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
            ) : photoPreview ? (
              <img
                src={photoPreview}
                alt="미리보기"
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-200 shadow-sm"
              />
            ) : (
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-4xl hover:scale-105 transition-transform active:scale-95 shadow-sm"
              >
                {avatar}
              </button>
            )}

            {/* 실제 사진 있을 때 제거 버튼 */}
            {avatarUrl && (
              <button
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gray-400 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* 사진 업로드 버튼들 */}
          {!photoPreview && !avatarUrl && (
            <p className="text-xs text-gray-400">탭해서 이모티콘 변경</p>
          )}

          {/* 사진 선택 / 촬영 */}
          {!avatarUrl && (
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium">
                <span>📷</span>
                <span>카메라</span>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium">
                <span>🖼️</span>
                <span>갤러리</span>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* 사진 미리보기 후 저장/취소 */}
          {photoPreview && !avatarUrl && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhotoPreview(null);
                  if (cameraRef.current) cameraRef.current.value = "";
                  if (galleryRef.current) galleryRef.current.value = "";
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handlePhotoUpload}
                disabled={photoUploading}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
              >
                {photoUploading ? "저장 중..." : "사진 저장"}
              </button>
            </div>
          )}

          {/* 실제 사진 있을 때 변경 버튼 */}
          {avatarUrl && (
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium">
                <span>📷</span>
                <span>사진 변경</span>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium">
                <span>🖼️</span>
                <span>갤러리</span>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* 사진 미리보기 후 저장/취소 (실제 사진 있을 때 변경하는 경우) */}
          {photoPreview && avatarUrl && (
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  setPhotoPreview(null);
                  if (cameraRef.current) cameraRef.current.value = "";
                  if (galleryRef.current) galleryRef.current.value = "";
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handlePhotoUpload}
                disabled={photoUploading}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
              >
                {photoUploading ? "저장 중..." : "사진 저장"}
              </button>
            </div>
          )}

          {/* 이모티콘 선택기 */}
          {showAvatarPicker && !avatarUrl && (
            <div className="w-full bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAvatarSelect(emoji)}
                    className={`text-2xl p-2 rounded-xl transition-all active:scale-90 ${
                      avatar === emoji
                        ? "bg-red-50 border-2 border-red-300 scale-110"
                        : "bg-white border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{user.name}</p>
            {user.batch && <p className="text-sm text-gray-400">⏰ {user.batch}</p>}
          </div>
        </div>

        {/* 정보 표시 / 편집 */}
        {!editing ? (
          <div className="space-y-3">
            <InfoRow icon="👤" label="이름" value={user.name} />
            <InfoRow icon="⏰" label="목표 기상 시간" value={user.batch || "미설정"} />
            <InfoRow icon="🎯" label="기상 목적" value={user.purpose || "미설정"} />

            <button
              onClick={() => setEditing(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors mt-2"
            >
              ✏️ 프로필 수정
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block ml-1">👤 이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-red-300"
                placeholder="이름"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block ml-1">⏰ 목표 기상 시간</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-red-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block ml-1">🎯 기상 목적</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-red-300"
                placeholder="예: 코딩 공부, 운동..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setEditing(false);
                  setName(user.name);
                  setWakeTime(user.batch || "");
                  setPurpose(user.purpose || "");
                }}
                className="py-3 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #FF4757, #C0392B)" }}
              >
                {saving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={`text-center text-sm ${message.includes("실패") ? "text-red-500" : "text-green-500"}`}>
            {message}
          </p>
        )}
      </div>

      {/* 통계 + 뱃지 */}
      <StatsCard userId={user.id} />

      {/* 알림 설정 카드 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">⚙️ 설정</h3>
        <NotificationToggle userId={user.id} />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-400 flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
