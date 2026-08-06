import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません（.env.local を確認してください）"
  );
}

export type AuthedContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  gardenId: string;
};

const bearerTokenFrom = (req: NextRequest): string | null => {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
};

// リクエストのAuthorizationヘッダーからログインユーザーを特定し、
// そのユーザーが所属するgarden_idを解決する。
// 呼び出し元のfetchはlib/apiFetch.tsのauthedFetchを使うこと。
export const getAuthedContext = async (req: NextRequest): Promise<AuthedContext | null> => {
  const token = bearerTokenFrom(req);
  if (!token) return null;

  const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("garden_members")
    .select("garden_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) return null;

  return { supabase, userId: userData.user.id, gardenId: membership.garden_id };
};
