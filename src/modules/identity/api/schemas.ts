import { z } from "zod";

export const createProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  importGuestData: z.boolean().optional(),
});

export const selectProfileInputSchema = z.object({
  profileId: z.string().uuid(),
  importGuestData: z.boolean().optional(),
});

export const profileSummarySchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
  isActive: z.boolean(),
});

export const profilesResponseSchema = z.object({
  activeProfileId: z.string().uuid().nullable(),
  profiles: z.array(profileSummarySchema),
});

export const signInInputSchema = z.object({
  email: z.email().max(320),
  displayName: z.string().trim().max(120).optional(),
});

export const authSessionResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
  }),
});

export type SignInInput = z.infer<typeof signInInputSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;
export type SelectProfileInput = z.infer<typeof selectProfileInputSchema>;
