import { NextRequest, NextResponse } from "next/server";
import { createProfileInputSchema } from "@/modules/identity/api/schemas";
import { createProfile, listProfiles } from "@/modules/identity/application/profiles";

export async function GET() {
  const result = await listProfiles();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const profile = await createProfile(parsed.data);
  return NextResponse.json(profile, { status: 201 });
}
