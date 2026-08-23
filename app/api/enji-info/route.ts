import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/apiAuth";
import { resolveFoodId } from "@/lib/foodNameResolver";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const VIRTUAL_ID_PREFIX = "virtual:";

type ChildRow = {
  id: string;
  name: string | null;
  age_month: number | null;
  created_at: string;
};

type RestrictionRow = {
  id: string;
  child_id: string;
  food_id: number | null;
  cannot_eat: boolean | null;
  note: string | null;
  created_at: string;
};

const upsertChild = async (
  supabase: SupabaseClient<Database>,
  gardenId: string,
  childName: string,
  ageMonth: number
): Promise<string | null> => {
  const { data: existing } = await supabase
    .from("children")
    .select("id")
    .eq("garden_id", gardenId)
    .eq("name", childName)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    await supabase.from("children").update({ age_month: ageMonth }).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("children")
    .insert({ garden_id: gardenId, name: childName, age_month: ageMonth })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) return null;
  return data.id;
};

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase, gardenId } = ctx;

    const { child_name, age_month, no_eat, can_eat, note, food_id, mode } = await req.json();

    if (!child_name || typeof age_month !== "number" || Number.isNaN(age_month)) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const childId = await upsertChild(supabase, gardenId, child_name, age_month);
    if (childId == null) {
      return NextResponse.json({ error: "Failed to register child info" }, { status: 500 });
    }

    // Adding a child only registers a row in children
    if (mode === "child") {
      return NextResponse.json({ ok: true, child_id: childId });
    }

    const noEatText = typeof no_eat === "string" ? no_eat : "";
    const resolvedFoodId =
      typeof food_id === "number" ? food_id : await resolveFoodId(supabase, gardenId, noEatText);
    if (resolvedFoodId == null) {
      return NextResponse.json({ error: "Please select a registered food" }, { status: 400 });
    }

    const { error } = await supabase.from("child_food_restrictions").insert({
      child_id: childId,
      food_id: resolvedFoodId,
      cannot_eat: typeof can_eat === "boolean" ? !can_eat : true,
      note: typeof note === "string" ? note : "",
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, child_id: childId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase, gardenId } = ctx;

    const { id, child_name, age_month, no_eat, can_eat, note, food_id } = await req.json();

    if (
      typeof id !== "string" ||
      !child_name ||
      typeof age_month !== "number" ||
      Number.isNaN(age_month) ||
      typeof can_eat !== "boolean"
    ) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const childId = await upsertChild(supabase, gardenId, child_name, age_month);
    if (childId == null) {
      return NextResponse.json({ error: "Failed to update child info" }, { status: 500 });
    }

    const noEatText = typeof no_eat === "string" ? no_eat : "";
    const resolvedFoodId =
      typeof food_id === "number" ? food_id : await resolveFoodId(supabase, gardenId, noEatText);
    if (resolvedFoodId == null) {
      return NextResponse.json({ error: "Please select a registered food" }, { status: 400 });
    }

    const { error } = await supabase
      .from("child_food_restrictions")
      .update({
        child_id: childId,
        food_id: resolvedFoodId,
        cannot_eat: !can_eat,
        note: typeof note === "string" ? note : "",
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase, gardenId } = ctx;

    const [{ data: childData, error: childError }, { data: restrictionData, error: restrictionError }] =
      await Promise.all([
        supabase.from("children").select("id, name, age_month, created_at").eq("garden_id", gardenId).returns<ChildRow[]>(),
        supabase
          .from("child_food_restrictions")
          .select("id, child_id, food_id, cannot_eat, note, created_at, children!inner(garden_id)")
          .eq("children.garden_id", gardenId)
          .order("created_at", { ascending: false })
          .returns<RestrictionRow[]>(),
      ]);

    if (childError || restrictionError) {
      console.error(childError ?? restrictionError);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const childRows = childData ?? [];
    const restrictionRows = restrictionData ?? [];

    const childMap = new Map<string, { child_name: string; age_month: number; created_at: string }>();
    for (const row of childRows) {
      const name = (row.name ?? "").trim();
      if (!name) continue;
      childMap.set(row.id, {
        child_name: name,
        age_month: row.age_month ?? 0,
        created_at: row.created_at,
      });
    }

    const foodIds = Array.from(
      new Set(restrictionRows.map((row) => row.food_id).filter((id): id is number => typeof id === "number"))
    );

    const foodNameMap = new Map<number, string>();
    if (foodIds.length > 0) {
      const { data: foodRows } = await supabase
        .from("foods")
        .select("id, name")
        .in("id", foodIds)
        .returns<Array<{ id: number; name: string | null }>>();
      for (const row of foodRows ?? []) {
        if (typeof row.name === "string") foodNameMap.set(row.id, row.name);
      }
    }

    const items = restrictionRows.map((row) => {
      const child = childMap.get(row.child_id);
      return {
        id: row.id,
        child_name: child?.child_name ?? "Child",
        age_month: child?.age_month ?? 0,
        no_eat: typeof row.food_id === "number" ? foodNameMap.get(row.food_id) ?? "" : "",
        can_eat: row.cannot_eat === null ? null : !row.cannot_eat,
        note: row.note ?? "",
        created_at: row.created_at,
      };
    });

    // Also include children with no registered food restrictions in the list (virtual row; ignored on DELETE)
    const existingChildIds = new Set(restrictionRows.map((row) => row.child_id));
    for (const [childId, child] of childMap.entries()) {
      if (existingChildIds.has(childId)) continue;
      items.push({
        id: `${VIRTUAL_ID_PREFIX}${childId}`,
        child_name: child.child_name,
        age_month: child.age_month,
        no_eat: "",
        can_eat: true,
        note: "",
        created_at: child.created_at,
      });
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase, gardenId } = ctx;

    const { id, child_name, delete_child } = await req.json();

    // Delete child panel: remove from children, and also remove associated child_food_restrictions
    if (delete_child === true && typeof child_name === "string" && child_name.trim()) {
      const targetName = child_name.trim();
      const { data: childRows, error: childError } = await supabase
        .from("children")
        .select("id")
        .eq("garden_id", gardenId)
        .eq("name", targetName)
        .returns<Array<{ id: string }>>();

      if (childError) {
        console.error(childError);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      }

      const childIds = (childRows ?? []).map((row) => row.id);
      if (childIds.length === 0) {
        return NextResponse.json({ ok: true });
      }

      const { error: restrictionDeleteError } = await supabase
        .from("child_food_restrictions")
        .delete()
        .in("child_id", childIds);

      if (restrictionDeleteError) {
        console.error(restrictionDeleteError);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      }

      const { error: childDeleteError } = await supabase.from("children").delete().in("id", childIds);

      if (childDeleteError) {
        console.error(childDeleteError);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (typeof id !== "string") {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    // Pseudo rows (virtual IDs) have no corresponding child_food_restrictions entity, so they are ignored
    if (id.startsWith(VIRTUAL_ID_PREFIX)) return NextResponse.json({ ok: true });

    const { error } = await supabase.from("child_food_restrictions").delete().eq("id", id);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
