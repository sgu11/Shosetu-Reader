import { ensureDefaultUser } from "@/lib/auth/default-user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserContext } from "../domain/user-context";
import { resolveActiveProfileContext } from "./profiles";

/**
 * V2 identity seam.
 *
 * This prefers the selected active profile and falls back to the
 * existing default-user flow until profile selection fully lands.
 */
export async function resolveUserContext(): Promise<UserContext> {
  const activeProfile = await resolveActiveProfileContext();
  if (activeProfile) {
    return activeProfile;
  }

  const userId = await ensureDefaultUser();
  const db = getDb();
  const [user] = await db
    .select({
      email: users.email,
      displayName: users.displayName,
      preferredUiLocale: users.preferredUiLocale,
      preferredReaderLanguage: users.preferredReaderLanguage,
      theme: users.theme,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    userId,
    authStrategy: "default-user",
    isAuthenticated: false,
    email: user?.email ?? "anonymous@shosetu-reader.local",
    displayName: user?.displayName ?? "Reader",
    preferredUiLocale: user?.preferredUiLocale ?? "ko",
    preferredReaderLanguage: user?.preferredReaderLanguage ?? "ja",
    theme: user?.theme ?? "system",
  };
}

export async function resolveUserId(): Promise<string> {
  const context = await resolveUserContext();
  return context.userId;
}
