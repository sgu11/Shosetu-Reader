import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL_DAYS = 1;

export async function issueCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function validateCsrfToken(req: Request): Promise<boolean> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
