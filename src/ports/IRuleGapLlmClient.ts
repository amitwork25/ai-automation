import type { RuleGapResolution } from "../contracts/pipeline.js";

export interface RuleGapLlmInput {
  productId: string;
  unmappedRules: Array<{ caseId: string; text: string; manualStepIndex?: number }>;
  retrievalContext?: Array<{
    caseId: string;
    manualStepIndex: number;
    queryText: string;
    hits: Array<{ collection: string; text: string }>;
  }>;
}

export interface IRuleGapLlmClient {
  resolveRuleGaps(input: RuleGapLlmInput): Promise<RuleGapResolution[]>;
}
