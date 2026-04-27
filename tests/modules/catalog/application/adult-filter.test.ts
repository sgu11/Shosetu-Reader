import { describe, expect, it } from "vitest";
import { filterAdultContent } from "@/modules/catalog/application/adult-filter";

describe("filterAdultContent", () => {
  const items = [
    { sourceSite: "syosetu" as const, title: "general" },
    { sourceSite: "nocturne" as const, title: "adult" },
  ];

  it("hides adult sources when context is null (anonymous)", () => {
    expect(filterAdultContent(items, null)).toEqual([
      { sourceSite: "syosetu", title: "general" },
    ]);
  });

  it("hides adult sources when adultContentEnabled is false", () => {
    expect(
      filterAdultContent(items, { adultContentEnabled: false }),
    ).toEqual([{ sourceSite: "syosetu", title: "general" }]);
  });

  it("returns all items when adultContentEnabled is true", () => {
    expect(
      filterAdultContent(items, { adultContentEnabled: true }),
    ).toEqual(items);
  });
});
