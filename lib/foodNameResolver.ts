import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type FoodRow = { id: number };
type FoodAliasRow = { food_id: number };

const findFoodId = async (
  client: SupabaseClient<Database>,
  gardenId: string | null,
  name: string
): Promise<number | null> => {
  const base = client.from("foods").select("id").eq("name", name).limit(1);
  const query = gardenId ? base.eq("garden_id", gardenId) : base.is("garden_id", null);
  const { data, error } = await query.maybeSingle<FoodRow>();
  if (error) return null;
  return data?.id ?? null;
};

// 食材名からfoods.idを解決する。
// 1) 共通食材(garden_id is null) 2) 園独自食材 3) 表記揺れ(food_aliases) の順で探す。
export const resolveFoodId = async (
  client: SupabaseClient<Database>,
  gardenId: string,
  foodName: string
): Promise<number | null> => {
  const trimmed = foodName.trim();
  if (!trimmed) return null;

  const globalId = await findFoodId(client, null, trimmed);
  if (globalId != null) return globalId;

  const gardenSpecificId = await findFoodId(client, gardenId, trimmed);
  if (gardenSpecificId != null) return gardenSpecificId;

  const { data: aliasRow, error: aliasError } = await client
    .from("food_aliases")
    .select("food_id")
    .eq("alias", trimmed)
    .limit(1)
    .maybeSingle<FoodAliasRow>();

  if (aliasError || !aliasRow) return null;
  return aliasRow.food_id;
};
