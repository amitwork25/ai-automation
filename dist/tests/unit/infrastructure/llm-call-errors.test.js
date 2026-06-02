import { describe, expect, it } from "vitest";
import { isLlmQuotaOrRateLimitError, LlmApiError, llmFailOpen } from "../../../src/infrastructure/llm/llm-call-errors.js";
describe("llm-call-errors", () => {
    it("detects quota errors from message", () => {
        expect(isLlmQuotaOrRateLimitError(new Error("Gemini call failed: 429 quota"))).toBe(true);
    });
    it("detects LlmApiError 429", () => {
        expect(isLlmQuotaOrRateLimitError(new LlmApiError("rate limited", 429, true))).toBe(true);
    });
    it("defaults LLM_FAIL_OPEN to true", () => {
        expect(llmFailOpen({})).toBe(true);
        expect(llmFailOpen({ LLM_FAIL_OPEN: "false" })).toBe(false);
    });
});
