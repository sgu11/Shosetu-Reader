import { NextRequest, NextResponse } from "next/server";
import { signInInputSchema } from "@/modules/identity/api/schemas";
import { signInWithEmail } from "@/modules/identity/application/session-auth";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signInInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const session = await signInWithEmail(parsed.data);
  return NextResponse.json(session, { status: 201 });
}
