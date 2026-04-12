import { env } from "@/lib/env";

interface ModelPricing {
  promptPricePerToken: number;
  completionPricePerToken: number;
}

let pricingCache: Map<string, ModelPricing> | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchPricing(): Promise<Map<string, ModelPricing>> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Map();
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    return pricingCache ?? new Map();
  }

  const data = await res.json();
  const models: { id: string; pricing?: { prompt?: string; completion?: string } }[] = data.data ?? [];

  const map = new Map<string, ModelPricing>();
  for (const model of models) {
    if (model.pricing?.prompt && model.pricing?.completion) {
      map.set(model.id, {
        promptPricePerToken: parseFloat(model.pricing.prompt),
        completionPricePerToken: parseFloat(model.pricing.completion),
      });
    }
  }

  pricingCache = map;
  lastFetchedAt = Date.now();
  return map;
}

async function getPricing(): Promise<Map<string, ModelPricing>> {
  if (pricingCache && Date.now() - lastFetchedAt < CACHE_TTL_MS) {
    return pricingCache;
  }
  return fetchPricing();
}

/**
 * Estimate the USD cost of a translation given its model and token counts.
 * Returns null if pricing data is unavailable for the model.
 */
export async function estimateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number | null> {
  const pricing = await getPricing();
  const modelPricing = pricing.get(modelName);
  if (!modelPricing) {
    return null;
  }

  return (
    inputTokens * modelPricing.promptPricePerToken +
    outputTokens * modelPricing.completionPricePerToken
  );
}

/**
 * Get pricing info for a model. Used for pre-translation cost estimates.
 */
export async function getModelPricing(modelName: string): Promise<ModelPricing | null> {
  const pricing = await getPricing();
  return pricing.get(modelName) ?? null;
}
