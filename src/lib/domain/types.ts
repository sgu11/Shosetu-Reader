// Shared domain types used across modules.
// These are plain TypeScript types — not tied to any ORM or framework.

export type SourceSite = "syosetu";

export type FetchStatus = "pending" | "fetching" | "fetched" | "failed";

export type TranslationStatus = "queued" | "processing" | "available" | "failed";

export type UiLocale = "en" | "ko";

export type ContentLanguage = "ja" | "ko";

export type Theme = "light" | "dark" | "system";

export type JobStatus = "queued" | "running" | "completed" | "failed";

// --- Branded IDs for type safety across module boundaries ---

export type NovelId = string & { readonly __brand: "NovelId" };
export type EpisodeId = string & { readonly __brand: "EpisodeId" };
export type UserId = string & { readonly __brand: "UserId" };
export type TranslationId = string & { readonly __brand: "TranslationId" };
export type SubscriptionId = string & { readonly __brand: "SubscriptionId" };
