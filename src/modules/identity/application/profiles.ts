import { randomUUID } from "crypto";
import { eq, ne } from "drizzle-orm";
import { getDefaultUserId } from "@/lib/auth/default-user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { UserContext } from "../domain/user-context";
import { clearActiveProfileId, getActiveProfileId, setActiveProfileId } from "../infra/active-profile-cookie";
import { migrateGuestStateToProfile } from "./guest-profile-migration";

function createProfileEmail(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "profile";

  return `${slug}-${randomUUID()}@profiles.local`;
}

export interface ProfileSummary {
  id: string;
  displayName: string;
  createdAt: string;
  isActive: boolean;
}

export async function listProfiles(): Promise<{
  activeProfileId: string | null;
  profiles: ProfileSummary[];
}> {
  const db = getDb();
  const defaultUserId = getDefaultUserId();
  const activeProfileId = await getActiveProfileId();

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(ne(users.id, defaultUserId));

  const profiles = rows
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({
      id: row.id,
      displayName: row.displayName ?? "Unnamed profile",
      createdAt: row.createdAt.toISOString(),
      isActive: row.id === activeProfileId,
    }));

  return { activeProfileId, profiles };
}

export async function createProfile(input: {
  displayName: string;
  importGuestData?: boolean;
}): Promise<ProfileSummary> {
  const db = getDb();
  const displayName = input.displayName.trim();

  const [row] = await db
    .insert(users)
    .values({
      email: createProfileEmail(displayName),
      displayName,
    })
    .returning({
      id: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
    });

  if (input.importGuestData ?? true) {
    await migrateGuestStateToProfile(row.id, true);
  }

  await setActiveProfileId(row.id);

  return {
    id: row.id,
    displayName: row.displayName ?? displayName,
    createdAt: row.createdAt.toISOString(),
    isActive: true,
  };
}

export async function selectProfile(input: {
  profileId: string;
  importGuestData?: boolean;
}): Promise<ProfileSummary> {
  const db = getDb();

  const [profile] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, input.profileId))
    .limit(1);

  if (!profile || profile.id === getDefaultUserId()) {
    throw new Error("Profile not found");
  }

  if (input.importGuestData ?? false) {
    await migrateGuestStateToProfile(profile.id, false);
  }

  await setActiveProfileId(profile.id);

  return {
    id: profile.id,
    displayName: profile.displayName ?? "Unnamed profile",
    createdAt: profile.createdAt.toISOString(),
    isActive: true,
  };
}

export async function clearActiveProfileSelection(): Promise<void> {
  await clearActiveProfileId();
}

export async function resolveActiveProfileContext(): Promise<UserContext | null> {
  const profileId = await getActiveProfileId();
  if (!profileId) {
    return null;
  }

  const db = getDb();
  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      preferredUiLocale: users.preferredUiLocale,
      preferredReaderLanguage: users.preferredReaderLanguage,
      theme: users.theme,
    })
    .from(users)
    .where(eq(users.id, profileId))
    .limit(1);

  if (!profile || profile.id === getDefaultUserId()) {
    await clearActiveProfileId();
    return null;
  }

  return {
    userId: profile.id,
    authStrategy: "profile",
    isAuthenticated: false,
    email: profile.email,
    displayName: profile.displayName,
    preferredUiLocale: profile.preferredUiLocale,
    preferredReaderLanguage: profile.preferredReaderLanguage,
    theme: profile.theme,
  };
}
