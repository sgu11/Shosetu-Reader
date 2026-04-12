import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchNovelMetadata, SyosetuApiError } from "@/modules/source/infra/syosetu-api";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const VALID_API_RESPONSE = [
  { allcount: 1 },
  {
    title: "無職転生",
    ncode: "N9669BK",
    writer: "理不尽な孫の手",
    story: "34歳職歴無し住所不定無職童貞のニートは...",
    general_firstup: "2012-11-22 17:00:34",
    general_lastup: "2015-04-03 23:00:00",
    end: 0,
    general_all_no: 286,
    length: 2830123,
    novelupdated_at: "2023-09-09 15:32:56",
  },
];

describe("fetchNovelMetadata", () => {
  it("parses a valid API response into normalized metadata", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(VALID_API_RESPONSE),
    });

    const result = await fetchNovelMetadata("n9669bk");

    expect(result.ncode).toBe("n9669bk");
    expect(result.title).toBe("無職転生");
    expect(result.authorName).toBe("理不尽な孫の手");
    expect(result.totalEpisodes).toBe(286);
    expect(result.isCompleted).toBe(true);
    expect(result.raw).toEqual(VALID_API_RESPONSE[1]);
  });

  it("calls the correct Syosetu API URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(VALID_API_RESPONSE),
    });

    await fetchNovelMetadata("n9669bk");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.syosetu.com/novelapi/api");
    expect(calledUrl).toContain("ncode=n9669bk");
    expect(calledUrl).toContain("out=json");
  });

  it("throws SyosetuApiError on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(fetchNovelMetadata("n9669bk")).rejects.toThrow(
      SyosetuApiError,
    );
  });

  it("throws SyosetuApiError when novel not found (empty results)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ allcount: 0 }]),
    });

    await expect(fetchNovelMetadata("n0000xx")).rejects.toThrow(
      "Novel not found",
    );
  });
});
