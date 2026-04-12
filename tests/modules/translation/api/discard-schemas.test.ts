import { describe, expect, it } from "vitest";
import {
  discardEpisodeTranslationInputSchema,
  discardNovelTranslationsInputSchema,
  discardTranslationsResponseSchema,
} from "@/modules/translation/api/schemas";

describe("discardEpisodeTranslationInputSchema", () => {
  it("accepts translation id or model name", () => {
    expect(
      discardEpisodeTranslationInputSchema.safeParse({
        translationId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);

    expect(
      discardEpisodeTranslationInputSchema.safeParse({
        modelName: "google/gemini-2.5-flash-lite",
      }).success,
    ).toBe(true);
  });
});

describe("discardNovelTranslationsInputSchema", () => {
  it("accepts an optional model name", () => {
    const result = discardNovelTranslationsInputSchema.safeParse({
      modelName: "google/gemini-2.5-flash-lite",
    });

    expect(result.success).toBe(true);
  });
});

describe("discardTranslationsResponseSchema", () => {
  it("accepts a deleted count response", () => {
    const result = discardTranslationsResponseSchema.safeParse({
      deletedCount: 3,
    });

    expect(result.success).toBe(true);
  });
});
