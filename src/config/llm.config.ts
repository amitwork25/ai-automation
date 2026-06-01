export type LlmProviderName = "gemini" | "openai" | "heuristic";

export interface LlmConfig {
  provider: LlmProviderName;
  geminiApiKey?: string;
  /** Primary Gemini model (quotas are per model — not shared with gemini-2.0-flash). */
  geminiModel: string;
  /** Tried in order when primary returns 429 / quota errors. */
  geminiModelFallbacks: string[];
  openaiApiKey?: string;
  openaiModel: string;
}

/** Default primary: generous free-tier bucket (separate from exhausted gemini-2.0-flash). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export const DEFAULT_GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash"
];

export function parseGeminiModelList(env: NodeJS.ProcessEnv = process.env): {
  primary: string;
  fallbacks: string[];
} {
  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const fromEnv = env.GEMINI_MODEL_FALLBACKS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const fallbacks = (fromEnv?.length ? fromEnv : DEFAULT_GEMINI_MODEL_FALLBACKS).filter(
    (model) => model !== primary
  );
  return { primary, fallbacks: [...new Set(fallbacks)] };
}

export function resolveLlmProvider(env: NodeJS.ProcessEnv = process.env): LlmProviderName {
  const explicit = env.LLM_PROVIDER?.trim().toLowerCase();

  if (explicit === "heuristic") {
    return "heuristic";
  }
  if (explicit === "gemini") {
    return env.GEMINI_API_KEY?.trim() ? "gemini" : "heuristic";
  }
  if (explicit === "openai") {
    return env.OPENAI_API_KEY?.trim() ? "openai" : "heuristic";
  }

  if (env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  if (env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  return "heuristic";
}

export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const { primary, fallbacks } = parseGeminiModelList(env);
  return {
    provider: resolveLlmProvider(env),
    geminiApiKey: env.GEMINI_API_KEY?.trim() || undefined,
    geminiModel: primary,
    geminiModelFallbacks: fallbacks,
    openaiApiKey: env.OPENAI_API_KEY?.trim() || undefined,
    openaiModel: env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
  };
}
