// 로컬 인메모리 데이터 저장소 (Supabase 없을 때 사용)

export interface MockUser {
  id: string;
  name: string;
  created_at: string;
}

export interface MockCheckin {
  id: string;
  user_id: string;
  image_url: string;
  checkin_time: string;
  status: string;
  penalty: number;
}

// 글로벌 인메모리 저장소
const globalStore = globalThis as unknown as {
  __mock_users?: MockUser[];
  __mock_checkins?: MockCheckin[];
};

if (!globalStore.__mock_users) {
  globalStore.__mock_users = [];
}
if (!globalStore.__mock_checkins) {
  globalStore.__mock_checkins = [];
}

export const mockUsers = globalStore.__mock_users;
export const mockCheckins = globalStore.__mock_checkins;

// Supabase가 플레이스홀더인지 확인
export function isUsingMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.includes("placeholder") || url === "" || url === "https://placeholder.supabase.co";
}

// 간단한 UUID 생성
export function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
