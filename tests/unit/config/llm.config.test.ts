import { describe, expect, it } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  loadLlmConfig,
  parseGeminiModelList,
  resolveLlmProvider
} from "../../../src/config/llm.config.js";

describe("llm.config", () => {
  it("prefers gemini when GEMINI_API_KEY is set", () => {
    expect(
      resolveLlmProvider({
        GEMINI_API_KEY: "gem-key",
        OPENAI_API_KEY: "oa-key"
      })
    ).toBe("gemini");
  });

  it("uses openai when only OPENAI_API_KEY is set", () => {
    expect(
      resolveLlmProvider({
        OPENAI_API_KEY: "oa-key"
      })
    ).toBe("openai");
  });

  it("honors explicit LLM_PROVIDER=openai", () => {
    expect(
      resolveLlmProvider({
        LLM_PROVIDER: "openai",
        GEMINI_API_KEY: "gem-key",
        OPENAI_API_KEY: "oa-key"
      })
    ).toBe("openai");
  });

  it("falls back to heuristic when provider key is missing", () => {
    expect(
      resolveLlmProvider({
        LLM_PROVIDER: "gemini"
      })
    ).toBe("heuristic");
  });

  it("loads gemini model defaults", () => {
    const config = loadLlmConfig({
      GEMINI_API_KEY: "gem-key"
    });
    expect(config.provider).toBe("gemini");
    expect(config.geminiModel).toBe(DEFAULT_GEMINI_MODEL);
    expect(config.geminiModelFallbacks.length).toBeGreaterThan(0);
  });

  it("parses custom model and fallbacks", () => {
    const { primary, fallbacks } = parseGeminiModelList({
      GEMINI_MODEL: "gemini-2.5-flash",
      GEMINI_MODEL_FALLBACKS: "gemini-2.5-flash-lite,gemini-1.5-flash"
    });
    expect(primary).toBe("gemini-2.5-flash");
    expect(fallbacks).toEqual(["gemini-2.5-flash-lite", "gemini-1.5-flash"]);
  });
});
