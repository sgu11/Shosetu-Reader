import { describe, expect, it } from "vitest";
import { libraryItemSchema, updateProgressInputSchema } from "@/modules/library/api/schemas";

describe("libraryItemSchema", () => {
  it("accepts a library item with status overview", () => {
    const result = libraryItemSchema.safeParse({
      novelId: "550e8400-e29b-41d4-a716-446655440000",
      titleJa: "テスト小説",
      titleKo: "테스트 소설",
      titleNormalized: "tesuto shosetsu",
      authorName: "Author",
      isCompleted: false,
      totalEpisodes: 20,
      subscribedAt: "2026-04-11T12:00:00.000Z",
      lastReadAt: "2026-04-11T13:00:00.000Z",
      currentEpisodeNumber: 4,
      currentLanguage: "ko",
      hasNewEpisodes: false,
      statusOverview: {
        fetchedEpisodes: 12,
        translatedEpisodes: 5,
        activeTranslations: 2,
        totalCostUsd: 0.0042,
        translatedByModel: [
          {
            modelName: "google/gemini-2.5-flash-lite",
            translatedEpisodes: 5,
            totalCostUsd: 0.0042,
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });
});

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
