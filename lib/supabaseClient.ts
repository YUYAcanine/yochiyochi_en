import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY is not set (check your .env.local)"
  );
}

// Client intended for use in the browser. After logging in, the session (JWT)
// is stored in localStorage and automatically attached to subsequent requests.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
