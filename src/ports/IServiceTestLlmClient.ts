export interface ServiceTestLlmApiContext {
  apiId: string;
  method: string;
  path: string;
  serviceClassName: string;
  serviceMethodName: string;
  hasRequestBody: boolean;
  smokeSpec: string;
  relatedRules: Array<{
    ruleId: string;
    text: string;
    layer: string;
    path?: string;
    op?: string;
    expected?: unknown;
  }>;
}

export interface ServiceTestLlmInput {
  productId: string;
  apis: ServiceTestLlmApiContext[];
}

export interface ServiceTestLlmEnrichment {
  apiId: string;
  additionalTests: string;
}

export interface IServiceTestLlmClient {
  enrichServiceTests(input: ServiceTestLlmInput): Promise<ServiceTestLlmEnrichment[]>;
}
