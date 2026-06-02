import { loadLlmConfig } from "../../config/llm.config.js";
import { callGeminiJsonChatWithFallback } from "./gemini-json.client.js";
import { loadLlmSystemPrompt } from "./load-llm-prompt.js";
export class GeminiLinkerFallbackLlmClient {
    apiKey;
    model;
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }
    async mapUnmappedSteps(input) {
        const { data, modelUsed } = await callGeminiJsonChatWithFallback({
            apiKey: this.apiKey,
            model: this.model,
            system: loadLlmSystemPrompt(),
            user: JSON.stringify({ task: "step-2m-linker-fallback", ...input })
        });
        const parsed = data;
        return {
            mappings: parsed.mappings ?? [],
            modelUsed
        };
    }
}
export class OpenAiLinkerFallbackLlmClient {
    apiKey;
    model;
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }
    async mapUnmappedSteps(input) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.model,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: loadLlmSystemPrompt() },
                    { role: "user", content: JSON.stringify({ task: "step-2m-linker-fallback", ...input }) }
                ]
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI linker-fallback failed: ${response.status} ${await response.text()}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("OpenAI linker-fallback returned empty content");
        }
        const parsed = JSON.parse(content);
        return {
            mappings: parsed.mappings ?? [],
            modelUsed: this.model
        };
    }
}
export function createLinkerFallbackLlmClient() {
    const config = loadLlmConfig();
    if (config.provider === "gemini" && config.geminiApiKey) {
        return new GeminiLinkerFallbackLlmClient(config.geminiApiKey, config.geminiModel);
    }
    if (config.provider === "openai" && config.openaiApiKey) {
        return new OpenAiLinkerFallbackLlmClient(config.openaiApiKey, config.openaiModel);
    }
    return null;
}
