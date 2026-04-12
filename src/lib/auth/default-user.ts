import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// Fixed UUID for the anonymous/default user.
// Replace with real auth (e.g. NextAuth) in a later phase.
const DEFAULT_USER_ID = "00000000-0000-4000-a000-000000000001";
const DEFAULT_EMAIL = "anonymous@shosetu-reader.local";

export function getDefaultUserId(): string {
  return DEFAULT_USER_ID;
}

/**
 * Ensures the default anonymous user row exists in the database.
 * Called lazily on first library/progress operation.
 */
export async function ensureDefaultUser(): Promise<string> {
  const db = getDb();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, DEFAULT_USER_ID))
    .limit(1);

  if (existing) return existing.id;

  await db.insert(users).values({
    id: DEFAULT_USER_ID,
    email: DEFAULT_EMAIL,
    displayName: "Reader",
  });

  return DEFAULT_USER_ID;
}
