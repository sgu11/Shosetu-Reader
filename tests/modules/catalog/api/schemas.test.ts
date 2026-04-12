import { describe, expect, it } from "vitest";
import { novelResponseSchema } from "@/modules/catalog/api/schemas";

describe("novelResponseSchema", () => {
  it("accepts a novel response with status overview", () => {
    const result = novelResponseSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      sourceNcode: "n1234ab",
      sourceUrl: "https://ncode.syosetu.com/n1234ab/",
      titleJa: "テスト小説",
      titleKo: "테스트 소설",
      titleNormalized: "tesuto shosetsu",
      authorName: "Author",
      summaryJa: "summary",
      summaryKo: "요약",
      isCompleted: false,
      totalEpisodes: 20,
      lastSourceSyncAt: "2026-04-11T12:00:00.000Z",
      createdAt: "2026-04-11T11:00:00.000Z",
      statusOverview: {
        fetchedEpisodes: 12,
        translatedEpisodes: 5,
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
