import { loadLlmConfig } from "../../config/llm.config.js";
import type {
  IServiceTestLlmClient,
  ServiceTestLlmEnrichment,
  ServiceTestLlmInput
} from "../../ports/IServiceTestLlmClient.js";
import { callGeminiJsonChatWithFallback } from "./gemini-json.client.js";
import { loadLlmSystemPrompt } from "./load-llm-prompt.js";

async function callLlm(input: ServiceTestLlmInput): Promise<ServiceTestLlmEnrichment[]> {
  const config = loadLlmConfig();
  const payload = { task: "step-10b-service-test-enrich", ...input };

  if (config.provider === "gemini" && config.geminiApiKey) {
    const { data } = await callGeminiJsonChatWithFallback({
      apiKey: config.geminiApiKey,
      system: loadLlmSystemPrompt(),
      user: JSON.stringify(payload)
    });
    const parsed = data as { enrichments?: ServiceTestLlmEnrichment[] };
    return parsed.enrichments ?? [];
  }

  if (config.provider === "openai" && config.openaiApiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: loadLlmSystemPrompt() },
          { role: "user", content: JSON.stringify(payload) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI service-test enrich failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI service-test enrich returned empty content");
    }

    const parsed = JSON.parse(content) as { enrichments?: ServiceTestLlmEnrichment[] };
    return parsed.enrichments ?? [];
  }

  return [];
}

export class ServiceTestLlmClient implements IServiceTestLlmClient {
  async enrichServiceTests(input: ServiceTestLlmInput): Promise<ServiceTestLlmEnrichment[]> {
    return callLlm(input);
  }
}

export function createServiceTestLlmClient(): IServiceTestLlmClient | null {
  const config = loadLlmConfig();
  if (config.provider === "heuristic") {
    return null;
  }
  return new ServiceTestLlmClient();
}
