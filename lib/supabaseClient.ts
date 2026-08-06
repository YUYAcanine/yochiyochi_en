import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません（.env.local を確認してください）"
  );
}

// ブラウザで使う想定のクライアント。ログインするとセッション（JWT）が
// localStorage に保存され、以降のリクエストに自動で付与される。
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
