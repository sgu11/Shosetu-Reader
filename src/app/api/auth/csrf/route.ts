import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await issueCsrfToken();
  return NextResponse.json({ token });
}
