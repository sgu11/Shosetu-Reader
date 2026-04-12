import { z } from "zod";

// --- Request translation ---

export const requestTranslationInputSchema = z.object({
  targetLanguage: z.literal("ko"),
});

export type RequestTranslationInput = z.infer<typeof requestTranslationInputSchema>;

// --- Translation status response ---

export const translationStatusResponseSchema = z.object({
  episodeId: z.string().uuid(),
  targetLanguage: z.literal("ko"),
  status: z.enum(["not_requested", "queued", "processing", "available", "failed"]),
  translatedText: z.string().nullable(),
  provider: z.string().nullable(),
  modelName: z.string().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type TranslationStatusResponse = z.infer<
  typeof translationStatusResponseSchema
>;
