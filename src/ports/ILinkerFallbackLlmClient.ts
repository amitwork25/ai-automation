export interface LinkerFallbackLlmInput {
  productId: string;
  unmappedSteps: Array<{ caseId: string; manualStepIndex: number; manualText: string }>;
  apiCatalog: Array<{ apiId: string; method: string; path: string; title?: string; operationId?: string }>;
  journeyContext?: Array<{ caseId: string; mappedApiIds: string[] }>;
}

export interface LinkerFallbackMapping {
  caseId: string;
  manualStepIndex: number;
  manualText: string;
  apiIds: string[];
  confidence: number;
  matchMethod: string;
  reason: string;
}

export interface LinkerFallbackLlmResult {
  mappings: LinkerFallbackMapping[];
  modelUsed: string;
}

export interface ILinkerFallbackLlmClient {
  mapUnmappedSteps(input: LinkerFallbackLlmInput): Promise<LinkerFallbackLlmResult>;
}
