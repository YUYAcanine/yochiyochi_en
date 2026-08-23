-- Add a food_name snapshot column to accidents, matching the JP schema.
--
-- Public/anon readers of the home-page feed (`GET /api/accidents?public=true`)
-- can only read `foods` rows where `garden_id is null` (see the
-- "anyone can read shared foods" RLS policy in 0001_new_schema.sql). A
-- nursery's custom food (garden_id set) is therefore invisible to anon,
-- so resolving the display name purely via `food_id -> foods.name` at read
-- time yields an empty string for accidents that reference a custom food.
--
-- The fix: store the food name directly on the accident row at the time it
-- is reported (snapshot), and prefer that snapshot when displaying, falling
-- back to the foods join only if the snapshot is missing (e.g. older rows).

alter table public.accidents
  add column if not exists food_name text;

-- Backfill existing rows where possible. This can only recover names for
-- foods still visible under RLS from a service-role connection (i.e. run
-- this in the Supabase SQL editor, which uses the postgres role and bypasses
-- RLS, so all foods are visible regardless of garden_id).
update public.accidents a
set food_name = f.name
from public.foods f
where a.food_id = f.id
  and a.food_name is null;
