import { NextResponse } from "next/server";
import { resolveUserContext } from "@/modules/identity/application/resolve-user-context";

export async function GET() {
  const context = await resolveUserContext();

  return NextResponse.json({
    isAuthenticated: context.isAuthenticated,
    user: {
      id: context.userId,
      email: context.email,
      displayName: context.displayName,
    },
  });
}
