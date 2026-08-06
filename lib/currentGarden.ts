"use client";

import { supabase } from "@/lib/supabaseClient";

// ログイン中ユーザーが所属するgardens.idを取得する（未ログインならnull）。
// 旧実装のtoGardenId(memberId)（会員IDの数字部分を流用する方式）を置き換える。
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
