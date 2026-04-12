import { NextResponse } from "next/server";
import { signOutCurrentSession } from "@/modules/identity/application/session-auth";

export async function POST() {
  await signOutCurrentSession();
  return NextResponse.json({ ok: true });
}
