function customAssertFunctionName(ruleId) {
    return `assertCustom_${ruleId.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}
function hitsForRule(input, rule) {
    if (!input.retrievalContext) {
        return [];
    }
    const match = input.retrievalContext.find((entry) => entry.caseId === rule.caseId &&
        (rule.manualStepIndex === undefined || entry.manualStepIndex === rule.manualStepIndex) &&
        entry.queryText.trim() === rule.text.trim());
    return match?.hits ?? [];
}
function pathAccessor(pathValue) {
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
function renderHeuristicBody(rule, hits) {
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
export class HeuristicCustomAssertLlmClient {
    async generateCustomAsserts(input) {
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
export class OpenAiCustomAssertLlmClient {
    apiKey;
    model;
    constructor(apiKey, model = process.env.OPENAI_MODEL ?? "gpt-4o-mini") {
        this.apiKey = apiKey;
        this.model = model;
    }
    async generateCustomAsserts(input) {
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
                        content: "Generate TypeScript custom assert functions for Playwright journey context objects. Return JSON { generations: CustomAssertGeneration[] } where each item has ruleId, functionName, body (full export function source), provider='openai'. Use ctx: Record<string, unknown> and throw Error on failure."
                    },
                    {
                        role: "user",
                        content: JSON.stringify(input)
                    }
                ]
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI custom-assert call failed: ${response.status} ${await response.text()}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("OpenAI custom-assert call returned empty content");
        }
        const parsed = JSON.parse(content);
        return (parsed.generations ?? []).map((entry) => ({ ...entry, provider: "openai" }));
    }
}
export function createCustomAssertLlmClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey) {
        return new OpenAiCustomAssertLlmClient(apiKey);
    }
    return new HeuristicCustomAssertLlmClient();
}
