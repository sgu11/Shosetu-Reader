import { describe, expect, it } from "vitest";
import {
  authSessionResponseSchema,
  signInInputSchema,
} from "@/modules/identity/api/schemas";

describe("signInInputSchema", () => {
  it("accepts a valid email and optional display name", () => {
    const result = signInInputSchema.safeParse({
      email: "reader@example.com",
      displayName: "Reader One",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signInInputSchema.safeParse({
      email: "reader-at-example.com",
    });

    expect(result.success).toBe(false);
  });
});

describe("authSessionResponseSchema", () => {
  it("accepts an authenticated session payload", () => {
    const result = authSessionResponseSchema.safeParse({
      isAuthenticated: true,
      user: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "reader@example.com",
        displayName: "Reader One",
      },
    });

    expect(result.success).toBe(true);
  });
});
