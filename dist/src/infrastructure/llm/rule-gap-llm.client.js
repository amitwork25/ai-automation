const UI_ONLY_PATTERN = /lands on|entry is available|can start the journey|screen loads|open the app|dashboard|navigation|without already having/i;
const ASSERT_FN_PATTERN = /\b(assert[A-Z][A-Za-z0-9_]*)\b/;
function hitsForRule(input, rule) {
    if (!input.retrievalContext) {
        return [];
    }
    const match = input.retrievalContext.find((entry) => entry.caseId === rule.caseId &&
        (rule.manualStepIndex === undefined || entry.manualStepIndex === rule.manualStepIndex) &&
        entry.queryText.trim() === rule.text.trim());
    return match?.hits ?? [];
}
export class HeuristicRuleGapLlmClient {
    async resolveRuleGaps(input) {
        return input.unmappedRules.map((rule) => {
            const hits = hitsForRule(input, rule);
            const joinedHits = hits.map((hit) => hit.text).join("\n");
            if (UI_ONLY_PATTERN.test(rule.text)) {
                return {
                    caseId: rule.caseId,
                    manualStepIndex: rule.manualStepIndex,
                    text: rule.text,
                    layer: "non_automatable",
                    parseStatus: "parsed",
                    reason: "Heuristic: UI-only expected result"
                };
            }
            const assertMatch = joinedHits.match(ASSERT_FN_PATTERN);
            if (assertMatch) {
                return {
                    caseId: rule.caseId,
                    manualStepIndex: rule.manualStepIndex,
                    text: rule.text,
                    layer: "journey",
                    assertFn: assertMatch[1],
                    parseStatus: "parsed",
                    reason: `Heuristic: matched assert fn from retrieval (${assertMatch[1]})`
                };
            }
            const pathMatch = joinedHits.match(/["']([a-zA-Z0-9_.]+)["']\s*[,)]/);
            if (pathMatch && /status|equals|present|length/i.test(rule.text)) {
                return {
                    caseId: rule.caseId,
                    manualStepIndex: rule.manualStepIndex,
                    text: rule.text,
                    layer: "journey",
                    path: pathMatch[1],
                    op: "present",
                    expected: true,
                    parseStatus: "parsed",
                    reason: "Heuristic: inferred path from retrieval snippet"
                };
            }
            return {
                caseId: rule.caseId,
                manualStepIndex: rule.manualStepIndex,
                text: rule.text,
                layer: "journey",
                parseStatus: "unmapped",
                reason: "Heuristic: no confident match"
            };
        });
    }
}
export class OpenAiRuleGapLlmClient {
    apiKey;
    model;
    constructor(apiKey, model = process.env.OPENAI_MODEL ?? "gpt-4o-mini") {
        this.apiKey = apiKey;
        this.model = model;
    }
    async resolveRuleGaps(input) {
        const prompt = {
            productId: input.productId,
            unmappedRules: input.unmappedRules,
            retrievalContext: input.retrievalContext?.slice(0, 20)
        };
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
                        content: "Convert unresolved manual test expected results into structured business rules. Return JSON: { resolutions: RuleGapResolution[] } where each item has caseId, manualStepIndex, text, layer (journey|service|non_automatable), optional path, op, expected, assertFn, parseStatus (parsed|unmapped), reason."
                    },
                    {
                        role: "user",
                        content: JSON.stringify(prompt)
                    }
                ]
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI rule-gap call failed: ${response.status} ${await response.text()}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("OpenAI rule-gap call returned empty content");
        }
        const parsed = JSON.parse(content);
        return parsed.resolutions ?? [];
    }
}
export function createRuleGapLlmClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey) {
        return new OpenAiRuleGapLlmClient(apiKey);
    }
    return new HeuristicRuleGapLlmClient();
}
