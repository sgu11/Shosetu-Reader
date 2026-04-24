import { describe, it, expect } from "vitest";
import { __getClientIpForTest } from "@/lib/rate-limit";

function makeReq(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
  } as unknown as import("next/server").NextRequest;
}

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    expect(
      __getClientIpForTest(makeReq({ "x-real-ip": "1.2.3.4" })),
    ).toBe("1.2.3.4");
  });

  it("uses first x-forwarded-for entry (leftmost = original client)", () => {
    expect(
      __getClientIpForTest(
        makeReq({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" }),
      ),
    ).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when no headers set", () => {
    expect(__getClientIpForTest(makeReq({}))).toBe("unknown");
  });

  it("trims whitespace in forwarded-for", () => {
    expect(
      __getClientIpForTest(
        makeReq({ "x-forwarded-for": "  5.6.7.8  , 10.0.0.1" }),
      ),
    ).toBe("5.6.7.8");
  });
});
