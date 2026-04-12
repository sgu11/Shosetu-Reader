import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { isValidUuid } from "@/lib/validation";

export const ACTIVE_PROFILE_COOKIE_NAME = "active_profile_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export async function getActiveProfileId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_PROFILE_COOKIE_NAME)?.value;
  if (!value || !isValidUuid(value)) {
    return null;
  }
  return value;
}

export async function setActiveProfileId(profileId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_PROFILE_COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearActiveProfileId(): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_PROFILE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}
