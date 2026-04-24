export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prewarmOpenRouterModelsCache } = await import(
      "@/lib/openrouter/models-cache"
    );
    await prewarmOpenRouterModelsCache();
  } catch {
    // Pre-warm is best-effort; cold path still works.
  }
}
