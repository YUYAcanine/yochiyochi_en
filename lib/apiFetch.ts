import { supabase } from "@/lib/supabaseClient";

// 認証が必要な自前APIを呼ぶ際、現在のSupabaseセッションのアクセストークンを
// Authorizationヘッダーに自動で付与するfetchラッパー。
export const authedFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
};
