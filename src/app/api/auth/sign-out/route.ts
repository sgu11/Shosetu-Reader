import { NextRequest, NextResponse } from "next/server";
import { signOutCurrentSession } from "@/modules/identity/application/session-auth";
import { validateCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  if (!(await validateCsrfToken(request))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  await signOutCurrentSession();
  return NextResponse.json({ ok: true });
}
