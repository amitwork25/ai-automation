/** Thrown when the remote LLM API rejects the call (quota, rate limit, auth). */
export class LlmApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = "LlmApiError";
  }
}

export function isLlmQuotaOrRateLimitError(error: unknown): boolean {
  if (!(error instanceof LlmApiError)) {
    const message = error instanceof Error ? error.message : String(error);
    return /\b429\b|quota|rate.?limit|resource_exhausted/i.test(message);
  }
  return error.retryable || error.statusCode === 429;
}

export function llmFailOpen(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.LLM_FAIL_OPEN?.trim().toLowerCase();
  if (value === "false" || value === "0") {
    return false;
  }
  return true;
}
