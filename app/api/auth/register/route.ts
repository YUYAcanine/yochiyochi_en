import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { toAuthEmail } from "@/lib/memberAuth";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!memberId || !password) {
    return NextResponse.json({ error: "Please enter a member ID and password." }, { status: 400 });
  }

  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  const { data: existingGarden, error: gardenLookupError } = await supabaseAdmin
    .from("gardens")
    .select("id")
    .eq("member_code", memberId)
    .maybeSingle();

  if (gardenLookupError) {
    return NextResponse.json({ error: gardenLookupError.message }, { status: 500 });
  }
  if (existingGarden) {
    return NextResponse.json(
      { error: "This member ID is already registered." },
      { status: 409 }
    );
  }

  const email = toAuthEmail(memberId);

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { member_id: memberId },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "Failed to create user." },
      { status: 500 }
    );
  }

  const { data: garden, error: gardenInsertError } = await supabaseAdmin
    .from("gardens")
    .insert({ member_code: memberId })
    .select("id")
    .single();

  if (gardenInsertError || !garden) {
    // If only the user was created but the garden creation failed, roll back the user too
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json(
      { error: gardenInsertError?.message ?? "Failed to create the garden." },
      { status: 500 }
    );
  }

  const { error: memberInsertError } = await supabaseAdmin.from("garden_members").insert({
    garden_id: garden.id,
    user_id: createdUser.user.id,
    role: "staff",
  });

  if (memberInsertError) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    await supabaseAdmin.from("gardens").delete().eq("id", garden.id);
    return NextResponse.json({ error: memberInsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
