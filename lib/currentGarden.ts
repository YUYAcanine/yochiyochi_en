"use client";

import { supabase } from "@/lib/supabaseClient";

// Gets the gardens.id that the logged-in user belongs to (null if not logged in).
// Replaces the old implementation's toGardenId(memberId), which reused the numeric
// part of the member ID.
export const getCurrentGardenId = async (): Promise<string | null> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("garden_members")
    .select("garden_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.garden_id;
};
