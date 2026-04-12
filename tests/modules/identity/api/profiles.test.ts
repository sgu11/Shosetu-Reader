import { describe, expect, it } from "vitest";
import {
  createProfileInputSchema,
  profileSummarySchema,
  profilesResponseSchema,
  selectProfileInputSchema,
} from "@/modules/identity/api/schemas";

describe("createProfileInputSchema", () => {
  it("accepts a valid profile payload", () => {
    const result = createProfileInputSchema.safeParse({
      displayName: "Reader One",
      importGuestData: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = createProfileInputSchema.safeParse({
      displayName: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("selectProfileInputSchema", () => {
  it("accepts a valid profile selection payload", () => {
    const result = selectProfileInputSchema.safeParse({
      profileId: "9c87727f-957c-4873-8761-b5e93d3db8ba",
      importGuestData: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid profile id", () => {
    const result = selectProfileInputSchema.safeParse({
      profileId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });
});

describe("profileSummarySchema", () => {
  it("accepts a valid profile summary", () => {
    const result = profileSummarySchema.safeParse({
      id: "6f650b05-d82f-4928-ac06-2f532b289fd7",
      displayName: "Reader One",
      createdAt: "2026-04-11T12:00:00.000Z",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("profilesResponseSchema", () => {
  it("accepts a profiles response", () => {
    const result = profilesResponseSchema.safeParse({
      activeProfileId: "6f650b05-d82f-4928-ac06-2f532b289fd7",
      profiles: [
        {
          id: "6f650b05-d82f-4928-ac06-2f532b289fd7",
          displayName: "Reader One",
          createdAt: "2026-04-11T12:00:00.000Z",
          isActive: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
