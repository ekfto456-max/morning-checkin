import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// placeholder여도 createClient가 에러 안 나도록 항상 생성
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
