import { describe, expect, it, vi, beforeEach } from "vitest";
import { nocturneAdapter } from "@/modules/source/infra/nocturne-adapter";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const NOVEL18_API_RESPONSE = [
  { allcount: 1 },
  {
    title: "夜のお話",
    ncode: "N5555AA",
    writer: "夜の作家",
    story: "ストーリー...",
    general_firstup: "2020-01-01 00:00:00",
    general_lastup: "2024-01-01 00:00:00",
    end: 0,
    general_all_no: 50,
    length: 120000,
    novelupdated_at: "2024-01-01 00:00:00",
  },
];

describe("nocturneAdapter", () => {
  it("declares the right site identity", () => {
    expect(nocturneAdapter.site).toBe("nocturne");
    expect(nocturneAdapter.isAdult).toBe(true);
    expect(nocturneAdapter.supportedPeriods).toContain("daily");
  });

  it("matches a novel18 URL but not a bare ncode", () => {
    expect(nocturneAdapter.matchUrl("https://novel18.syosetu.com/n5555aa/")).toBe("n5555aa");
    expect(nocturneAdapter.matchBareId("n5555aa")).toBeNull();
    expect(nocturneAdapter.matchUrl("https://ncode.syosetu.com/n5555aa/")).toBeNull();
  });

  it("builds novel18 URLs", () => {
    expect(nocturneAdapter.buildNovelUrl("n5555aa")).toBe("https://novel18.syosetu.com/n5555aa/");
    expect(
      nocturneAdapter.buildEpisodeUrl("n5555aa", { episodeNumber: 3, sourceEpisodeId: "3" }),
    ).toBe("https://novel18.syosetu.com/n5555aa/3/");
  });

  it("calls the novel18 API with over18=yes cookie", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(NOVEL18_API_RESPONSE),
    });

    const meta = await nocturneAdapter.fetchNovelMetadata("n5555aa");

    const [calledUrl, init] = mockFetch.mock.calls[0];
    expect(calledUrl as string).toContain("api.syosetu.com/novel18api/api");
    expect((init as RequestInit).headers).toMatchObject({
      Cookie: "over18=yes",
    });
    expect(meta.id).toBe("n5555aa");
    expect(meta.title).toBe("夜のお話");
    expect(meta.totalEpisodes).toBe(50);
    expect(meta.isCompleted).toBe(true);
  });
});
