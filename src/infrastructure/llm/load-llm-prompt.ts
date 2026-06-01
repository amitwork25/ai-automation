import { readFileSync } from "node:fs";
import path from "node:path";

/** Task id sent in the user JSON "task" field — routes within llm.system.txt */
export type LlmTaskId = "step-5g-rule-gaps" | "step-12-custom-asserts" | "step-2m-linker-fallback";

export const LLM_SYSTEM_PROMPT_FILE = "llm.system.txt";

const promptCache = new Map<string, string>();

export function defaultLlmPromptsDir(projectRoot = process.cwd()): string {
  const configured = process.env.LLM_PROMPTS_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(projectRoot, configured);
  }
  return path.resolve(projectRoot, "agent-knowledge/prompts");
}

export function loadLlmSystemPrompt(options?: { promptsDir?: string }): string {
  const promptsDir = options?.promptsDir ?? defaultLlmPromptsDir();
  const cacheKey = `${promptsDir}:${LLM_SYSTEM_PROMPT_FILE}`;
  const cached = promptCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const filePath = path.join(promptsDir, LLM_SYSTEM_PROMPT_FILE);
  const content = readFileSync(filePath, "utf8").trim();
  promptCache.set(cacheKey, content);
  return content;
}

/** @deprecated Use loadLlmSystemPrompt(); task is passed in user JSON. */
export function loadLlmPrompt(_task?: LlmTaskId, options?: { promptsDir?: string }): string {
  return loadLlmSystemPrompt(options);
}

export function clearLlmPromptCache(): void {
  promptCache.clear();
}
