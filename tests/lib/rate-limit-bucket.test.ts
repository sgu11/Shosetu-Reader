import { afterEach, describe, expect, it } from "vitest";
import {
  __rateLimitInMemoryForTest as rateLimitInMemory,
  __resetBucketsForTest as resetBuckets,
} from "@/lib/rate-limit";

afterEach(() => {
  resetBuckets();
});

describe("rateLimitInMemory", () => {
  it("returns null while under the limit", async () => {
    const cfg = { limit: 3, windowSeconds: 60 };
    expect(rateLimitInMemory("k1", cfg)).toBeNull();
    expect(rateLimitInMemory("k1", cfg)).toBeNull();
    expect(rateLimitInMemory("k1", cfg)).toBeNull();
  });

  it("returns 429 once limit exceeded, with Retry-After + rate-limit headers", async () => {
    const cfg = { limit: 2, windowSeconds: 60 };
    rateLimitInMemory("k2", cfg);
    rateLimitInMemory("k2", cfg);
    const res = rateLimitInMemory("k2", cfg);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBeTruthy();
    expect(res?.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(res?.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("isolates buckets per key", async () => {
    const cfg = { limit: 1, windowSeconds: 60 };
    expect(rateLimitInMemory("a", cfg)).toBeNull();
    expect(rateLimitInMemory("b", cfg)).toBeNull();
    expect(rateLimitInMemory("a", cfg)?.status).toBe(429);
    expect(rateLimitInMemory("b", cfg)?.status).toBe(429);
  });

  it("rolls over after window expires", async () => {
    const cfg = { limit: 1, windowSeconds: 0 };
    expect(rateLimitInMemory("c", cfg)).toBeNull();
    await new Promise((r) => setTimeout(r, 5));
    expect(rateLimitInMemory("c", cfg)).toBeNull();
  });

  it("body contains expected error message", async () => {
    const cfg = { limit: 1, windowSeconds: 60 };
    rateLimitInMemory("d", cfg);
    const res = rateLimitInMemory("d", cfg);
    const body = await res!.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});
