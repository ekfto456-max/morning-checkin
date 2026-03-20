// 로컬 인메모리 데이터 저장소 (Supabase 없을 때 사용)

export interface MockUser {
  id: string;
  name: string;
  batch: string;
  purpose: string;
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

export interface MockExemption {
  id: string;
  user_id: string;
  reason: string;
  granted_at: string;
  used_at: string | null;
  used_for_date: string | null;
}

export interface MockSeal {
  id: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  accessories: string[];
  last_fed: string | null;
}

export interface MockSealFeed {
  id: string;
  user_id: string;
  fed_at: string;
}

// 글로벌 인메모리 저장소
const globalStore = globalThis as unknown as {
  __mock_users?: MockUser[];
  __mock_checkins?: MockCheckin[];
  __mock_exemptions?: MockExemption[];
  __mock_seal?: MockSeal;
  __mock_seal_feeds?: MockSealFeed[];
};

if (!globalStore.__mock_users) {
  globalStore.__mock_users = [];
}
if (!globalStore.__mock_checkins) {
  globalStore.__mock_checkins = [];
}
if (!globalStore.__mock_exemptions) {
  globalStore.__mock_exemptions = [];
}
if (!globalStore.__mock_seal) {
  globalStore.__mock_seal = {
    id: "seal-001",
    name: "뭉치",
    level: 1,
    exp: 0,
    hp: 70,
    accessories: [],
    last_fed: null,
  };
}
if (!globalStore.__mock_seal_feeds) {
  globalStore.__mock_seal_feeds = [];
}

export const mockUsers = globalStore.__mock_users;
export const mockCheckins = globalStore.__mock_checkins;
export const mockExemptions = globalStore.__mock_exemptions;
export const mockSeal = globalStore.__mock_seal;
export const mockSealFeeds = globalStore.__mock_seal_feeds;

export function getMockSeal(): MockSeal {
  return globalStore.__mock_seal!;
}

export function updateMockSeal(updates: Partial<MockSeal>): MockSeal {
  Object.assign(globalStore.__mock_seal!, updates);
  return globalStore.__mock_seal!;
}

// Supabase가 플레이스홀더인지 확인
export function isUsingMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.includes("placeholder") || url === "" || url === "https://placeholder.supabase.co";
}

// 간단한 UUID 생성
export function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
