import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  clearLlmPromptCache,
  defaultLlmPromptsDir,
  loadLlmSystemPrompt
} from "../../../src/infrastructure/llm/load-llm-prompt.js";

afterEach(() => {
  clearLlmPromptCache();
});

describe("load-llm-prompt", () => {
  it("loads single generic llm.system.txt", () => {
    const prompt = loadLlmSystemPrompt();
    expect(prompt).toContain("Platform goal");
    expect(prompt).toContain("TASK: step-5g-rule-gaps");
    expect(prompt).toContain("TASK: step-12-custom-asserts");
    expect(prompt).toContain("TASK: step-2m-linker-fallback");
    expect(prompt).not.toMatch(/TC-39|ccbp|bbps/i);
  });

  it("defaults prompts dir to agent-knowledge/prompts", () => {
    const dir = defaultLlmPromptsDir(path.resolve("."));
    expect(dir.endsWith("agent-knowledge/prompts")).toBe(true);
  });
});
