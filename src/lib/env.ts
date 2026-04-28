import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_DEFAULT_MODEL: z.string().optional().default("deepseek/deepseek-v4-flash"),
  OPENROUTER_SUMMARY_MODEL: z.string().optional(),
  OPENROUTER_EXTRACTION_MODEL: z.string().optional(),
  OPENROUTER_TITLE_MODEL: z.string().optional(),
  GLOSSARY_MAX_PROMPT_ENTRIES: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(500),
  ADMIN_API_KEY: z.string().optional(),
  TRANSLATION_COST_BUDGET_USD: z.coerce.number().positive().optional(),
  DEMO_MODE: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  DEMO_FIXTURES_PATH: z
    .string()
    .optional()
    .default("demo/seed/fixtures"),
});

export type Env = z.infer<typeof serverEnvSchema>;

const parsedEnv = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_SUMMARY_MODEL: process.env.OPENROUTER_SUMMARY_MODEL,
  OPENROUTER_EXTRACTION_MODEL: process.env.OPENROUTER_EXTRACTION_MODEL,
  OPENROUTER_TITLE_MODEL: process.env.OPENROUTER_TITLE_MODEL,
  GLOSSARY_MAX_PROMPT_ENTRIES: process.env.GLOSSARY_MAX_PROMPT_ENTRIES,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  TRANSLATION_COST_BUDGET_USD: process.env.TRANSLATION_COST_BUDGET_USD,
  DEMO_MODE: process.env.DEMO_MODE,
  DEMO_FIXTURES_PATH: process.env.DEMO_FIXTURES_PATH,
});

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration",
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error("Environment validation failed");
}

export const env = parsedEnv.data;

export type ModelWorkload =
  | "summary"
  | "extraction"
  | "title"
  | "translate"
  | "compare"
  | "bootstrap"
  | "default";

export type ReasoningEffort = "off" | "low" | "high" | "xhigh";

interface WorkloadProfile {
  /** Reasoning depth — applied to DeepSeek V4 / OpenRouter normalized 'reasoning'. */
  reasoning: ReasoningEffort;
  /** Soft cap; per-call sites may override. */
  maxTokens: number;
}

/**
 * Per-workload reasoning + max_tokens defaults.
 *
 * Output cost dominates routine translation. Body translation runs with
 * reasoning OFF so the model emits target text only. Glossary, bootstrap,
 * and comparison workloads are quality-sensitive single-shots — reasoning HIGH
 * pays for itself.
 */
const WORKLOAD_PROFILE: Record<Exclude<ModelWorkload, "default">, WorkloadProfile> = {
  translate:  { reasoning: "off",  maxTokens: 4096 },
  title:      { reasoning: "off",  maxTokens: 1024 },
  summary:    { reasoning: "off",  maxTokens: 2048 },
  extraction: { reasoning: "low",  maxTokens: 4096 },
  compare:    { reasoning: "high", maxTokens: 8192 },
  bootstrap:  { reasoning: "high", maxTokens: 8192 },
};

/**
 * Resolve the OpenRouter model for a specific workload.
 * Falls back to OPENROUTER_DEFAULT_MODEL if no workload-specific override is set.
 */
export function resolveModel(workload: ModelWorkload = "default"): string {
  switch (workload) {
    case "summary":
      return env.OPENROUTER_SUMMARY_MODEL || env.OPENROUTER_DEFAULT_MODEL;
    case "extraction":
    case "bootstrap":
      return env.OPENROUTER_EXTRACTION_MODEL || env.OPENROUTER_DEFAULT_MODEL;
    case "title":
      return env.OPENROUTER_TITLE_MODEL || env.OPENROUTER_DEFAULT_MODEL;
    case "translate":
    case "compare":
    case "default":
      return env.OPENROUTER_DEFAULT_MODEL;
  }
}

export function resolveWorkloadProfile(
  workload: ModelWorkload,
): WorkloadProfile {
  if (workload === "default") return WORKLOAD_PROFILE.translate;
  return WORKLOAD_PROFILE[workload];
}

/**
 * Provider routing hint for OpenRouter requests. Pinning DeepSeek-family
 * models to the `DeepSeek` provider keeps requests on the same KV-cache
 * domain so prefix-stable prompts hit DeepSeek's automatic context cache
 * (50× cheaper input). Without pinning, OpenRouter may route to a fallback
 * host that doesn't share the cache.
 */
export function providerHintFor(modelName: string): { only: string[] } | undefined {
  if (modelName.startsWith("deepseek/")) {
    return { only: ["DeepSeek"] };
  }
  return undefined;
}

/**
 * Translate a workload profile + model name into the OpenRouter body
 * fragment (reasoning + provider) for chat-completions.
 */
export function buildOpenRouterRoutingBody(
  workload: ModelWorkload,
  modelName: string,
): Record<string, unknown> {
  const profile = resolveWorkloadProfile(workload);
  const body: Record<string, unknown> = {};
  const provider = providerHintFor(modelName);
  if (provider) body.provider = provider;
  if (profile.reasoning !== "off") {
    body.reasoning = { effort: profile.reasoning };
  } else if (modelName.startsWith("deepseek/")) {
    // Explicitly disable thinking on DeepSeek so V4 doesn't burn output
    // tokens on chain-of-thought during routine body translation.
    body.reasoning = { exclude: true };
  }
  return body;
}

export function getPublicRuntimeConfig() {
  return {
    nodeEnv: env.NODE_ENV,
    appUrl: env.APP_URL,
  };
}
