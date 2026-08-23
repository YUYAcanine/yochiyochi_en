import { supabase } from "@/lib/supabaseClient";

// A fetch wrapper that automatically attaches the current Supabase session's
// access token to the Authorization header when calling our own APIs that require authentication.
export const authedFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
};
