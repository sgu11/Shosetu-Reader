import { describe, it, expect } from "vitest";
import { __getRetryDelayMsForTest as getRetryDelayMs } from "@/modules/jobs/application/job-runtime";

describe("getRetryDelayMs", () => {
  it("returns 1s on first attempt (attemptCount=1)", () => {
    expect(getRetryDelayMs(1)).toBe(1_000);
  });

  it("doubles on each attempt: 2s, 4s, 8s, 16s, 32s", () => {
    expect(getRetryDelayMs(2)).toBe(2_000);
    expect(getRetryDelayMs(3)).toBe(4_000);
    expect(getRetryDelayMs(4)).toBe(8_000);
    expect(getRetryDelayMs(5)).toBe(16_000);
    expect(getRetryDelayMs(6)).toBe(32_000);
  });

  it("caps at 60s for high attempt counts", () => {
    expect(getRetryDelayMs(7)).toBe(60_000);
    expect(getRetryDelayMs(20)).toBe(60_000);
    expect(getRetryDelayMs(1000)).toBe(60_000);
  });

  it("treats attemptCount<=0 as first attempt (1s, no negative exponent)", () => {
    expect(getRetryDelayMs(0)).toBe(1_000);
    expect(getRetryDelayMs(-5)).toBe(1_000);
  });
});
