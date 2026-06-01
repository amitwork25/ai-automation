import { loadLlmConfig } from "../../config/llm.config.js";
import type { BusinessRule, CustomAssertGeneration } from "../../contracts/pipeline.js";
import type { CustomAssertLlmInput, ICustomAssertLlmClient } from "../../ports/ICustomAssertLlmClient.js";
import { callGeminiJsonChatWithFallback } from "./gemini-json.client.js";
import { loadLlmSystemPrompt } from "./load-llm-prompt.js";

function customAssertFunctionName(ruleId: string): string {
  return `assertCustom_${ruleId.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function hitsForRule(
  input: CustomAssertLlmInput,
  rule: BusinessRule
): Array<{ collection: string; text: string }> {
  if (!input.retrievalContext) {
    return [];
  }
  const match = input.retrievalContext.find(
    (entry) =>
      entry.caseId === rule.caseId &&
      (rule.manualStepIndex === undefined || entry.manualStepIndex === rule.manualStepIndex) &&
      entry.queryText.trim() === rule.text.trim()
  );
  return match?.hits ?? [];
}

function pathAccessor(pathValue: string): string {
  const parts = pathValue.split(".").filter(Boolean);
  if (parts.length === 0) {
    return "ctx";
  }
  let expr = "ctx";
  for (const part of parts) {
    expr += `?.${part}`;
  }
  return expr;
}

function renderHeuristicBody(rule: BusinessRule, hits: Array<{ collection: string; text: string }>): string {
  const fn = customAssertFunctionName(rule.ruleId);
  const assertMatch = hits.map((hit) => hit.text).join("\n").match(/\b(assert[A-Z][A-Za-z0-9_]*)\b/);
  if (assertMatch) {
    return `export function ${fn}(ctx: Record<string, unknown>): void {
  ${assertMatch[1]}(ctx);
}`;
  }

  if (rule.assertFn) {
    return `export function ${fn}(ctx: Record<string, unknown>): void {
  ${rule.assertFn}(ctx);
}`;
  }

  if (rule.path && rule.op === "equals") {
    return `export function ${fn}(ctx: Record<string, unknown>): void {
  const actual = ${pathAccessor(rule.path)};
  if (actual !== ${JSON.stringify(rule.expected)}) {
    throw new Error(\`Expected ${rule.path} to equal ${JSON.stringify(rule.expected)}, got \${String(actual)}\`);
  }
}`;
  }

  if (rule.path && (rule.op === "present" || rule.op === "gt" || rule.op === "length")) {
    return `export function ${fn}(ctx: Record<string, unknown>): void {
  const actual = ${pathAccessor(rule.path)};
  if (actual === undefined || actual === null) {
    throw new Error(\`Expected ${rule.path} to be present\`);
  }
}`;
  }

  return `export function ${fn}(ctx: Record<string, unknown>): void {
  // TODO(step-12-llm): ${rule.text.replace(/\n/g, " ").slice(0, 120)}
  void ctx;
}`;
}

export class HeuristicCustomAssertLlmClient implements ICustomAssertLlmClient {
  async generateCustomAsserts(input: CustomAssertLlmInput): Promise<CustomAssertGeneration[]> {
    return input.rules.map((rule) => {
      const hits = hitsForRule(input, rule);
      const functionName = customAssertFunctionName(rule.ruleId);
      return {
        ruleId: rule.ruleId,
        functionName,
        body: renderHeuristicBody(rule, hits),
        provider: "heuristic"
      };
    });
  }
}

export class GeminiCustomAssertLlmClient implements ICustomAssertLlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generateCustomAsserts(input: CustomAssertLlmInput): Promise<CustomAssertGeneration[]> {
    const llmProvider = loadLlmConfig().provider;
    const { data } = await callGeminiJsonChatWithFallback({
      apiKey: this.apiKey,
      model: this.model,
      system: loadLlmSystemPrompt(),
      user: JSON.stringify({ task: "step-12-custom-asserts", llmProvider, ...input })
    });
    const parsed = data as { generations?: CustomAssertGeneration[] };

    return (parsed.generations ?? []).map((entry) => ({
      ...entry,
      provider: entry.provider ?? llmProvider
    }));
  }
}

export class OpenAiCustomAssertLlmClient implements ICustomAssertLlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  ) {}

  async generateCustomAsserts(input: CustomAssertLlmInput): Promise<CustomAssertGeneration[]> {
    const llmProvider = loadLlmConfig().provider;
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
          {
            role: "system",
            content: loadLlmSystemPrompt()
          },
          {
            role: "user",
            content: JSON.stringify({ task: "step-12-custom-asserts", llmProvider, ...input })
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI custom-assert call failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI custom-assert call returned empty content");
    }

    const parsed = JSON.parse(content) as { generations?: CustomAssertGeneration[] };
    return (parsed.generations ?? []).map((entry) => ({
      ...entry,
      provider: entry.provider ?? llmProvider
    }));
  }
}

export function createCustomAssertLlmClient(): ICustomAssertLlmClient {
  const config = loadLlmConfig();
  if (config.provider === "gemini" && config.geminiApiKey) {
    return new GeminiCustomAssertLlmClient(config.geminiApiKey, config.geminiModel);
  }
  if (config.provider === "openai" && config.openaiApiKey) {
    return new OpenAiCustomAssertLlmClient(config.openaiApiKey, config.openaiModel);
  }
  return new HeuristicCustomAssertLlmClient();
}
