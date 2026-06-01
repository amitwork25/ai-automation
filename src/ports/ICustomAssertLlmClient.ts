import type { BusinessRule, CustomAssertGeneration } from "../contracts/pipeline.js";

export interface CustomAssertLlmInput {
  productId: string;
  rules: BusinessRule[];
  retrievalContext?: Array<{
    caseId: string;
    manualStepIndex: number;
    queryText: string;
    hits: Array<{ collection: string; text: string }>;
  }>;
}

export interface ICustomAssertLlmClient {
  generateCustomAsserts(input: CustomAssertLlmInput): Promise<CustomAssertGeneration[]>;
}
