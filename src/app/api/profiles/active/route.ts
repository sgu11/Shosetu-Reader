import { NextRequest, NextResponse } from "next/server";
import { clearActiveProfileSelection, resolveActiveProfileContext, selectProfile } from "@/modules/identity/application/profiles";
import { selectProfileInputSchema } from "@/modules/identity/api/schemas";

export async function GET() {
  const activeProfile = await resolveActiveProfileContext();

  return NextResponse.json({
    activeProfileId: activeProfile?.userId ?? null,
    profile: activeProfile
      ? {
          id: activeProfile.userId,
          displayName: activeProfile.displayName ?? "Unnamed profile",
        }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = selectProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const profile = await selectProfile(parsed.data);
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
}

export async function DELETE() {
  await clearActiveProfileSelection();
  return NextResponse.json({ ok: true });
}
