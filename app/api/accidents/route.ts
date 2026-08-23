import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getAuthedContext } from "@/lib/apiAuth";
import { resolveFoodId } from "@/lib/foodNameResolver";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type AccidentRow = {
  id: string;
  created_at: string;
  child_id: string | null;
  food_id: number | null;
  content: string | null;
  is_public: boolean | null;
  garden_id: string | null;
};

const resolveChildId = async (
  client: SupabaseClient<Database>,
  gardenId: string,
  childName: string
): Promise<string | null> => {
  const trimmed = childName.trim();
  if (!trimmed) return null;

  const { data, error } = await client
    .from("children")
    .select("id")
    .eq("garden_id", gardenId)
    .eq("name", trimmed)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) return null;
  return data.id;
};

const buildFoodNameMap = async (client: SupabaseClient<Database>, foodIds: number[]) => {
  const foodNameMap = new Map<number, string>();
  if (foodIds.length === 0) return foodNameMap;

  const { data } = await client.from("foods").select("id, name").in("id", foodIds).returns<
    Array<{ id: number; name: string | null }>
  >();
  for (const row of data ?? []) {
    if (typeof row.name === "string") foodNameMap.set(row.id, row.name);
  }
  return foodNameMap;
};

const mapAccidentItems = async (
  client: SupabaseClient<Database>,
  accidents: AccidentRow[],
  childRows: Array<{ id: string; name: string | null }>,
  options: { includeChildName: boolean }
) => {
  const childNameMap = new Map<string, string>(childRows.map((row) => [row.id, (row.name ?? "").trim()]));

  const foodIds = Array.from(
    new Set(accidents.map((row) => row.food_id).filter((id): id is number => typeof id === "number"))
  );
  const foodNameMap = await buildFoodNameMap(client, foodIds);

  return accidents.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    // Rows with is_public=true are also served to unauthenticated third parties,
    // so the child's real name (PII) is omitted when includeChildName=false.
    child_name: options.includeChildName && row.child_id ? childNameMap.get(row.child_id) ?? "" : "",
    food_name: typeof row.food_id === "number" ? foodNameMap.get(row.food_id) ?? "" : "",
    accident_content: row.content ?? "",
    public: row.is_public,
    // The actual garden_id could allow identification, so it is not returned; only a boolean is passed
    from_garden: row.garden_id !== null,
  }));
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get("public") === "true";
    const limit = Number(searchParams.get("limit") ?? "200");
    const normalizedLimit = Number.isNaN(limit) ? 200 : Math.min(limit, 200);

    if (publicOnly) {
      // The public feed can be viewed without logging in (allowed by RLS's is_public=true rule)
      const { data: accidentData, error: accidentError } = await supabase
        .from("accidents")
        .select("id, created_at, child_id, food_id, content, is_public, garden_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(normalizedLimit)
        .returns<AccidentRow[]>();

      if (accidentError) {
        console.error(accidentError);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
      }

      const accidents = accidentData ?? [];
      // Since this is the unauthenticated public feed, child real names are not resolved or returned.
      const items = await mapAccidentItems(supabase, accidents, [], { includeChildName: false });
      return NextResponse.json({ items });
    }

    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase: authedSupabase, gardenId } = ctx;

    const { data: accidentData, error: accidentError } = await authedSupabase
      .from("accidents")
      .select("id, created_at, child_id, food_id, content, is_public, garden_id")
      .eq("garden_id", gardenId)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit)
      .returns<AccidentRow[]>();

    if (accidentError) {
      console.error(accidentError);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const accidents = accidentData ?? [];
    const { data: childData, error: childError } = await authedSupabase
      .from("children")
      .select("id, name")
      .eq("garden_id", gardenId)
      .returns<Array<{ id: string; name: string | null }>>();

    if (childError) {
      console.error(childError);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const items = await mapAccidentItems(authedSupabase, accidents, childData ?? [], { includeChildName: true });
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase: authedSupabase, gardenId } = ctx;

    const { child_name, food_name, accident_content, public: isPublic, food_id } = await req.json();

    if (!child_name || !food_name || !accident_content) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const childId = await resolveChildId(authedSupabase, gardenId, child_name);
    if (childId == null) {
      return NextResponse.json({ error: "Please register the child in the Child Info tab" }, { status: 400 });
    }

    const resolvedFoodId =
      typeof food_id === "number" ? food_id : await resolveFoodId(authedSupabase, gardenId, food_name);
    if (resolvedFoodId == null) {
      return NextResponse.json({ error: "Please select a registered food" }, { status: 400 });
    }

    const { error } = await authedSupabase.from("accidents").insert({
      garden_id: gardenId,
      child_id: childId,
      food_id: resolvedFoodId,
      content: accident_content,
      is_public: Boolean(isPublic),
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase: authedSupabase, gardenId } = ctx;

    const { id, child_name, food_name, accident_content, public: isPublic, food_id } = await req.json();

    if (typeof id !== "string" || !child_name || !food_name || !accident_content) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const childId = await resolveChildId(authedSupabase, gardenId, child_name);
    if (childId == null) {
      return NextResponse.json({ error: "Please register the child in the Child Info tab" }, { status: 400 });
    }

    const resolvedFoodId =
      typeof food_id === "number" ? food_id : await resolveFoodId(authedSupabase, gardenId, food_name);
    if (resolvedFoodId == null) {
      return NextResponse.json({ error: "Please select a registered food" }, { status: 400 });
    }

    // Rows with a garden_id other than this nursery's cannot be updated (or seen) due to RLS,
    // so no explicit ownership check is done here beyond the garden_id condition
    const { error, count } = await authedSupabase
      .from("accidents")
      .update(
        {
          child_id: childId,
          food_id: resolvedFoodId,
          content: accident_content,
          is_public: Boolean(isPublic),
        },
        { count: "exact" }
      )
      .eq("id", id)
      .eq("garden_id", gardenId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    if (count === 0) {
      return NextResponse.json({ error: "Update target not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase: authedSupabase, gardenId } = ctx;

    const { id } = await req.json();
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    // Rows with a garden_id other than this nursery's cannot be deleted (or seen) due to RLS,
    // so no explicit ownership check is done here beyond the garden_id condition
    const { error, count } = await authedSupabase
      .from("accidents")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("garden_id", gardenId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    if (count === 0) {
      return NextResponse.json({ error: "Delete target not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
