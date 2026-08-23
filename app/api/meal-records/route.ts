import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/apiAuth";

export const runtime = "nodejs";

const isRecordType = (value: unknown): value is "growth" | "hiyari" =>
  value === "growth" || value === "hiyari";

export async function POST() {
  return NextResponse.json(
    { error: "Creating new entries via this API has been discontinued. Please use /api/accidents." },
    { status: 410 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthedContext(req);
    if (!ctx) return NextResponse.json({ error: "Login is required" }, { status: 401 });
    const { supabase, gardenId } = ctx;

    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get("type");
    const limit = Number(searchParams.get("limit") ?? "5");

    if (recordType && !isRecordType(recordType)) {
      return NextResponse.json({ items: [] });
    }
    if (recordType === "growth") {
      return NextResponse.json({ items: [] });
    }

    const normalizedLimit = Number.isNaN(limit) ? 5 : Math.min(limit, 200);

    const { data: childData, error: childError } = await supabase
      .from("children")
      .select("id, name, age_month")
      .eq("garden_id", gardenId)
      .returns<Array<{ id: string; name: string | null; age_month: number | null }>>();

    if (childError) {
      console.error(childError);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const childRows = childData ?? [];
    if (childRows.length === 0) return NextResponse.json({ items: [] });
    const childIds = childRows.map((row) => row.id);

    const { data: accidentData, error: accidentError } = await supabase
      .from("accidents")
      .select("id, created_at, child_id, food_id, content")
      .in("child_id", childIds)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit)
      .returns<
        Array<{
          id: string;
          created_at: string;
          child_id: string | null;
          food_id: number | null;
          content: string | null;
        }>
      >();

    if (accidentError) {
      console.error(accidentError);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const accidents = accidentData ?? [];

    const foodIds = Array.from(
      new Set(accidents.map((row) => row.food_id).filter((id): id is number => typeof id === "number"))
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

    const childMap = new Map(
      childRows.map((row) => [row.id, { child_name: (row.name ?? "").trim(), age_month: row.age_month ?? 0 }])
    );

    const items = accidents.map((row) => ({
      id: row.id,
      child_name: row.child_id ? childMap.get(row.child_id)?.child_name ?? "" : "",
      age_month: row.child_id ? childMap.get(row.child_id)?.age_month ?? 0 : 0,
      food_name: typeof row.food_id === "number" ? foodNameMap.get(row.food_id) ?? "" : "",
      detail: row.content ?? "",
      record_type: "hiyari" as const,
      created_at: row.created_at,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
