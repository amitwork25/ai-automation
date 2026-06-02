import { readFileSync } from "node:fs";
import path from "node:path";
export const LLM_SYSTEM_PROMPT_FILE = "llm.system.txt";
const promptCache = new Map();
export function defaultLlmPromptsDir(projectRoot = process.cwd()) {
    const configured = process.env.LLM_PROMPTS_DIR?.trim();
    if (configured) {
        return path.isAbsolute(configured) ? configured : path.resolve(projectRoot, configured);
    }
    return path.resolve(projectRoot, "agent-knowledge/prompts");
}
export function loadLlmSystemPrompt(options) {
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
export function loadLlmPrompt(_task, options) {
    return loadLlmSystemPrompt(options);
}
export function clearLlmPromptCache() {
    promptCache.clear();
}
