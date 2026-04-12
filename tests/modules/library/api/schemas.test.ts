import { describe, expect, it } from "vitest";
import { updateProgressInputSchema } from "@/modules/library/api/schemas";

describe("updateProgressInputSchema", () => {
  it("accepts valid progress update", () => {
    const result = updateProgressInputSchema.safeParse({
      episodeId: "550e8400-e29b-41d4-a716-446655440000",
      language: "ja",
      scrollAnchor: "p-42",
      progressPercent: 65.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal fields", () => {
    const result = updateProgressInputSchema.safeParse({
      episodeId: "550e8400-e29b-41d4-a716-446655440000",
      language: "ko",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid language", () => {
    const result = updateProgressInputSchema.safeParse({
      episodeId: "550e8400-e29b-41d4-a716-446655440000",
      language: "en",
    });
    expect(result.success).toBe(false);
  });

  it("rejects progress over 100", () => {
    const result = updateProgressInputSchema.safeParse({
      episodeId: "550e8400-e29b-41d4-a716-446655440000",
      language: "ja",
      progressPercent: 150,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for episodeId", () => {
    const result = updateProgressInputSchema.safeParse({
      episodeId: "not-a-uuid",
      language: "ja",
    });
    expect(result.success).toBe(false);
  });
});
