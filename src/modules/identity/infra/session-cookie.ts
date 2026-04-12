import { createHash, randomBytes } from "crypto";

export const SESSION_COOKIE_NAME = "shosetu_session";
export const SESSION_TTL_DAYS = 30;

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
