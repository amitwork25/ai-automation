import { parseGeminiModelList } from "../../config/llm.config.js";
import { isLlmQuotaOrRateLimitError, LlmApiError } from "./llm-call-errors.js";

export interface GeminiJsonChatInput {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}

export interface GeminiJsonChatResult {
  data: unknown;
  modelUsed: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export function parseGeminiJsonText(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

export async function callGeminiJsonChat(input: GeminiJsonChatInput): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.system }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.user }]
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });

  const payload = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? JSON.stringify(payload);
    const retryable = response.status === 429 || response.status === 503;
    throw new LlmApiError(`Gemini call failed: ${response.status} ${message}`, response.status, retryable);
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini call returned empty content");
  }

  return parseGeminiJsonText(text);
}

/** Tries primary GEMINI_MODEL, then GEMINI_MODEL_FALLBACKS on quota / 429 (separate per-model limits). */
export async function callGeminiJsonChatWithFallback(
  input: Omit<GeminiJsonChatInput, "model"> & { model?: string }
): Promise<GeminiJsonChatResult> {
  const { primary, fallbacks } = parseGeminiModelList();
  const explicit = input.model?.trim();
  const models = explicit
    ? [explicit, ...fallbacks.filter((model) => model !== explicit)]
    : [primary, ...fallbacks];

  let lastError: unknown;
  for (const model of [...new Set(models)]) {
    try {
      const data = await callGeminiJsonChat({ ...input, model });
      return { data, modelUsed: model };
    } catch (error) {
      lastError = error;
      if (!isLlmQuotaOrRateLimitError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new LlmApiError(String(lastError), 429, true);
}
