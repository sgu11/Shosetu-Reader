import { z } from "zod";

export const translationModelCountSchema = z.object({
  modelName: z.string(),
  translatedEpisodes: z.number().int(),
  totalCostUsd: z.number().nullable(),
});

export const novelStatusOverviewSchema = z.object({
  fetchedEpisodes: z.number().int(),
  translatedEpisodes: z.number().int(),
  activeTranslations: z.number().int(),
  totalCostUsd: z.number().nullable(),
  translatedByModel: z.array(translationModelCountSchema),
});

export type TranslationModelCount = z.infer<typeof translationModelCountSchema>;
export type NovelStatusOverview = z.infer<typeof novelStatusOverviewSchema>;
