import { describe, expect, it } from "vitest";
import {
  buildEpisodeUrl,
  buildNovelUrl,
  isValidNcode,
  parseNcode,
} from "@/modules/source/domain/ncode";

describe("parseNcode", () => {
  it("extracts ncode from a bare code", () => {
    expect(parseNcode("n1234ab")).toBe("n1234ab");
  });

  it("normalizes uppercase to lowercase", () => {
    expect(parseNcode("N1234AB")).toBe("n1234ab");
  });

  it("trims whitespace", () => {
    expect(parseNcode("  n1234ab  ")).toBe("n1234ab");
  });

  it("extracts ncode from ncode.syosetu.com URL", () => {
    expect(parseNcode("https://ncode.syosetu.com/n1234ab/")).toBe("n1234ab");
  });

  it("extracts ncode from URL without trailing slash", () => {
    expect(parseNcode("https://ncode.syosetu.com/n1234ab")).toBe("n1234ab");
  });

  it("extracts ncode from novel18.syosetu.com URL", () => {
    expect(parseNcode("https://novel18.syosetu.com/n9876zz/")).toBe("n9876zz");
  });

  it("handles http (non-https) URLs", () => {
    expect(parseNcode("http://ncode.syosetu.com/n5555cc/")).toBe("n5555cc");
  });

  it("returns null for invalid input", () => {
    expect(parseNcode("hello world")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseNcode("")).toBeNull();
  });

  it("returns null for a non-syosetu URL", () => {
    expect(parseNcode("https://example.com/n1234ab/")).toBeNull();
  });

  it("returns null for ncode without digits", () => {
    expect(parseNcode("nabcdef")).toBeNull();
  });

  it("returns null for ncode without trailing letters", () => {
    expect(parseNcode("n1234")).toBeNull();
  });
});

describe("isValidNcode", () => {
  it("returns true for valid ncodes", () => {
    expect(isValidNcode("n1234ab")).toBe(true);
    expect(isValidNcode("n0001a")).toBe(true);
  });

  it("returns false for invalid ncodes", () => {
    expect(isValidNcode("1234ab")).toBe(false);
    expect(isValidNcode("n")).toBe(false);
    expect(isValidNcode("")).toBe(false);
  });
});

describe("buildNovelUrl", () => {
  it("builds the canonical Syosetu novel URL", () => {
    expect(buildNovelUrl("n1234ab")).toBe(
      "https://ncode.syosetu.com/n1234ab/",
    );
  });
});

describe("buildEpisodeUrl", () => {
  it("builds the canonical episode URL", () => {
    expect(buildEpisodeUrl("n1234ab", 5)).toBe(
      "https://ncode.syosetu.com/n1234ab/5/",
    );
  });
});
