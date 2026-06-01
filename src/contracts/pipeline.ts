export interface ManualStepApiRef {
  apiId?: string;
  method?: string;
  pathHint?: string;
  apiNameHint?: string;
}

export interface ManualTestStepInput {
  action: string;
  apiRef?: ManualStepApiRef;
  apiRefs?: ManualStepApiRef[];
  expectedResults?: string[];
  stepType?: string;
}

export interface ManualTestCaseInput {
  caseId: string;
  title: string;
  persona: string;
  journeyTags: string[];
  steps: Array<string | ManualTestStepInput>;
  expectedResults?: string[];
}

export interface AssertionHint {
  path: string;
  op: "equals" | "gt" | "lt" | "present" | "length";
  value: unknown;
}

export interface ManualTestCaseArtifact {
  caseId: string;
  title: string;
  persona: string;
  journeyTags: string[];
  steps: string[];
  expectedResults: string[];
  assertionHints: AssertionHint[];
  stepApiRefs?: Array<ManualStepApiRef | undefined>;
  stepApiRefGroups?: ManualStepApiRef[][];
  stepTypes?: string[];
}

export interface ManualTestCasesArtifact {
  productId: string;
  manualTcHash: string;
  cases: ManualTestCaseArtifact[];
}

export interface ApiContract {
  apiId: string;
  method: string;
  path: string;
  auth?: string;
  title?: string;
  operationId?: string;
  requestSchemaRef?: string;
  responseSchemaRef?: string;
  requestRequired: string[];
  responseFields: string[];
  samples?: Record<string, unknown>;
}

export interface ApiContractsArtifact {
  productId: string;
  apis: ApiContract[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  via: string;
  extract?: string;
  inject?: string;
}

export interface DependencyGraphArtifact {
  edges: DependencyEdge[];
  executionLayers: string[][];
}

export interface SchemaIndexArtifact {
  schemas: Record<string, unknown>;
  unresolvedRefs: string[];
}

export interface ApiAliasEntry {
  apiId?: string;
  phrases?: string[];
  composite?: string;
  apiIds?: string[];
}

export interface ApiAliasesConfig {
  productId: string;
  aliases: ApiAliasEntry[];
}

export interface StepMapping {
  caseId: string;
  manualStepIndex: number;
  manualText: string;
  apiIds: string[];
  confidence: number;
  matchMethod: string;
}

export interface JourneySpec {
  journeyId: string;
  persona: string;
  sourceCaseIds: string[];
  apiSequence: string[];
  stepMappings: StepMapping[];
  checkpoints: Array<{ afterApiId: string; caseId: string }>;
}

export interface JourneySpecArtifact {
  schemaVersion: "04-journey-spec-v1";
  productId: string;
  manualTcHash: string;
  mappingMeta: {
    totalSteps: number;
    mappedSteps: number;
    mappingRate: number;
    targetMet: boolean;
  };
  journeys: JourneySpec[];
  unmapped: Array<{
    caseId: string;
    manualStepIndex: number;
    manualText: string;
  }>;
}

export interface LinkerLlmMappingEntry {
  caseId: string;
  manualStepIndex: number;
  manualText: string;
  apiIds: string[];
  confidence: number;
  matchMethod: string;
  reason: string;
}

export interface LinkerLlmReportArtifact {
  schemaVersion: "04b-linker-llm-report-v1";
  productId: string;
  provider: LlmReportProvider;
  inputCount: number;
  acceptedCount: number;
  mappings: LinkerLlmMappingEntry[];
  modelUsed?: string;
  skippedReason?: string;
  error?: string;
}

export interface RepoServiceEntry {
  className: string;
  filePath: string;
}

export interface RepoSymbolEntry {
  name: string;
  filePath: string;
  kind: "function" | "async_function";
}

export interface ReferencePattern {
  id: string;
  description: string;
  paths: string[];
}

export interface RepoIndexArtifact {
  schemaVersion: "03-repo-index-v1";
  productId: string;
  repoRoot: string;
  services: RepoServiceEntry[];
  steps: RepoSymbolEntry[];
  journeys: RepoSymbolEntry[];
  assertions: RepoSymbolEntry[];
  specs: Array<{ name: string; filePath: string }>;
  folderLayout: Record<string, string>;
  referencePatterns: ReferencePattern[];
}

export type BusinessRuleLayer = "journey" | "service" | "non_automatable";
export type BusinessRuleSource = "assertionHint" | "parsedExpected" | "english";
export type BusinessRuleOp = AssertionHint["op"] | "length_gt" | "length_gte" | "contains_all";

export interface BusinessRule {
  ruleId: string;
  caseId: string;
  layer: BusinessRuleLayer;
  source: BusinessRuleSource;
  text: string;
  manualStepIndex?: number;
  apiIds?: string[];
  journeyId?: string;
  path?: string;
  op?: BusinessRuleOp;
  expected?: unknown;
  assertFn?: string;
  parseStatus: "parsed" | "unmapped";
}

export interface BusinessRulesArtifact {
  schemaVersion: "05-business-rules-v1";
  productId: string;
  manualTcHash: string;
  rules: BusinessRule[];
  unmappedRules: Array<{ caseId: string; text: string; manualStepIndex?: number }>;
  parseMeta: {
    totalExpected: number;
    parsedCount: number;
    parseRate: number;
    targetMet: boolean;
  };
}

export type RuleMappingStatus = "template" | "custom" | "non_automatable" | "approved";

export interface RuleMapping {
  ruleId: string;
  status: RuleMappingStatus;
  templateId?: string;
  contextPath?: string;
  expected?: unknown;
  assertFn?: string;
  reason?: string;
}

export interface BusinessRulesMappedArtifact {
  schemaVersion: "06-business-rules-mapped-v1";
  productId: string;
  mappings: RuleMapping[];
  pendingCustom: string[];
  mappingMeta: {
    totalRules: number;
    templateCount: number;
    customCount: number;
    nonAutomatableCount: number;
    approvedCount: number;
    mappingRate: number;
    targetMet: boolean;
  };
}

export interface AssertionCatalogTemplate {
  templateId: string;
  match: {
    op?: string;
    value?: unknown;
    path?: string;
    assertFn?: string;
  };
  emit: string;
}

export interface AssertionCatalog {
  schemaVersion: string;
  templates: AssertionCatalogTemplate[];
}

export interface ApprovedRuleMapping {
  ruleId?: string;
  textPattern?: string;
  status: RuleMappingStatus;
  templateId?: string;
  contextPath?: string;
  expected?: unknown;
  assertFn?: string;
}

export interface ApprovedRulesConfig {
  schemaVersion?: "rules-approved-v1";
  productId: string;
  version?: number;
  approvedAt?: string;
  sourceRunId?: string;
  rules: ApprovedRuleMapping[];
}

export interface CodegenFileEntry {
  apiId: string;
  files: string[];
}

export interface CodegenSkipEntry {
  apiId: string;
  reason: string;
  existingPath?: string;
}

export interface CodegenErrorEntry {
  apiId: string;
  message: string;
}

export interface ApiCodegenReportArtifact {
  schemaVersion: "09-api-codegen-report-v1";
  productId: string;
  repoRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  errors: CodegenErrorEntry[];
  summary: {
    totalApis: number;
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

export interface ServiceTestCodegenReportArtifact {
  schemaVersion: "10-service-test-report-v1";
  productId: string;
  repoRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  errors: CodegenErrorEntry[];
  summary: {
    totalApis: number;
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

export interface ServiceTestLlmEnrichmentEntry {
  apiId: string;
  files: string[];
  additionalTestCount: number;
}

export interface ServiceTestLlmReportArtifact {
  schemaVersion: "10b-service-test-llm-report-v1";
  productId: string;
  provider: LlmReportProvider;
  inputCount: number;
  enrichedCount: number;
  additionalTestCount: number;
  enrichments: ServiceTestLlmEnrichmentEntry[];
  errors: CodegenErrorEntry[];
  skippedReason?: string;
}

export interface LlmStepSummary {
  step: string;
  invoked: boolean;
  provider: LlmReportProvider;
  inputCount?: number;
  outputCount?: number;
  artifact?: string;
}

export interface LlmSummaryArtifact {
  schemaVersion: "00b-llm-summary-v1";
  productId: string;
  provider: LlmReportProvider;
  llmConfigured: boolean;
  totalLlmCalls: number;
  steps: LlmStepSummary[];
}

export interface JourneyPlanStep {
  order: number;
  apiIds?: string[];
  calls?: string[];
  call?: string;
  status: "resolved" | "generate";
  writes?: Record<string, string>;
  checkpoint?: string[];
}

export interface JourneyPlan {
  journeyId: string;
  persona: string;
  sourceCaseIds: string[];
  steps: JourneyPlanStep[];
}

export interface JourneyPlanArtifact {
  schemaVersion: "07-journey-plan-v1";
  productId: string;
  planner: "deterministic-v1";
  journeys: JourneyPlan[];
  planMeta: {
    totalCalls: number;
    resolvedCalls: number;
    generateCalls: number;
    targetMet: boolean;
  };
}

export interface AssertionCompileReportArtifact {
  schemaVersion: "11-assertion-compile-report-v1";
  productId: string;
  repoRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  pendingCustom: string[];
  errors: CodegenErrorEntry[];
  summary: {
    templateCount: number;
    compiledLines: number;
    generatedCount: number;
    skippedCount: number;
  };
}

export interface JourneyCodegenReportArtifact {
  schemaVersion: "13-journey-codegen-report-v1";
  productId: string;
  repoRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  errors: CodegenErrorEntry[];
  summary: {
    journeyCount: number;
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

export interface IncrementalDiffArtifact {
  schemaVersion: "03d-incremental-diff-v1";
  productId: string;
  mode: "incremental";
  newApis: string[];
  existingApis: string[];
  skipGenerate: string[];
  touchFiles: string[];
}

export interface CustomAssertCompileReportArtifact {
  schemaVersion: "12-custom-assert-report-v1";
  productId: string;
  repoRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  pendingLlm: string[];
  errors: CodegenErrorEntry[];
  summary: {
    customRuleCount: number;
    stubCount: number;
    skippedCount: number;
  };
}

export interface ValidationCheck {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface ValidationReportArtifact {
  schemaVersion: "15-validation-report-v1";
  productId: string;
  repoRoot: string;
  validationStatus: "pass" | "warn" | "fail";
  checks: ValidationCheck[];
  gapsRemaining: string[];
}

export interface TraceabilityRow {
  manualCaseId: string;
  ruleId: string;
  assertFn: string;
  specStep: string;
  apiId: string;
}

export interface TraceabilityArtifact {
  schemaVersion: "17-traceability-v1";
  productId: string;
  runId: string;
  rows: TraceabilityRow[];
  markdownPath?: string;
}

export interface ApprovalManifestArtifact {
  schemaVersion: "18-approval-manifest-v1";
  productId: string;
  runId: string;
  pendingRuleIds: string[];
  pendingCustomAssertIds: string[];
  unmappedManualSteps: Array<{ caseId: string; manualStepIndex: number; manualText: string }>;
  approvalStatus: "pending" | "none_required" | "approved";
}

export interface ApprovalResultArtifact {
  schemaVersion: "18-approval-result-v1";
  productId: string;
  runId: string;
  approvedAt: string;
  rulesApprovedVersion: number;
  approvedRuleCount: number;
  knowledgeIndexPath: string;
  rulesApprovedPath: string;
}

export interface PlaywrightProjectReportArtifact {
  schemaVersion: "14-playwright-project-v1";
  productId: string;
  runId: string;
  codegenRoot: string;
  generated: CodegenFileEntry[];
  skipped: CodegenSkipEntry[];
  errors: CodegenErrorEntry[];
  summary: {
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

export interface ReviewFinding {
  severity: "error" | "warn" | "info";
  code: string;
  message: string;
  refs: string[];
}

export interface ReviewReportArtifact {
  schemaVersion: "16-review-report-v1";
  productId: string;
  runId: string;
  reviewStatus: "pass" | "warn" | "fail";
  findings: ReviewFinding[];
  summary: {
    errorCount: number;
    warnCount: number;
  };
}

export interface ApprovedKnowledgeIndexArtifact {
  schemaVersion: "03a-approved-knowledge-v1";
  productId: string;
  sourceRunId: string;
  rulesVersion: number;
  documents: VectorIndexedDocument[];
  summary: {
    totalDocuments: number;
    indexedAt: string;
  };
}

export interface CustomAssertGeneration {
  ruleId: string;
  functionName: string;
  body: string;
  provider: LlmReportProvider;
}

export type LlmReportProvider = "gemini" | "openai" | "heuristic";

export type VectorCollectionName = "manual_tc" | "api_contracts" | "code_steps" | "code_asserts" | "ir_rules";

export interface VectorIndexedDocument {
  id: string;
  collection: VectorCollectionName;
  text: string;
  metadata: Record<string, unknown>;
}

export interface VectorIndexReportArtifact {
  schemaVersion: "03a-index-report-v1";
  productId: string;
  repoRoot: string;
  manualTcHash: string;
  collectionCounts: Record<string, number>;
  documents: VectorIndexedDocument[];
  summary: {
    totalDocuments: number;
    indexedAt: string;
  };
}

export interface VectorRetrievalHit {
  documentId: string;
  collection: VectorCollectionName;
  score: number;
  text: string;
  metadata: Record<string, unknown>;
}

export interface VectorRetrievalContextArtifact {
  schemaVersion: "03b-retrieval-context-v1";
  productId: string;
  manualTcHash: string;
  topK: number;
  results: Array<{
    queryId: string;
    caseId: string;
    manualStepIndex: number;
    queryText: string;
    hits: VectorRetrievalHit[];
  }>;
  summary: {
    queryCount: number;
    hitCount: number;
  };
}

export interface RuleGapResolution {
  caseId: string;
  manualStepIndex?: number;
  text: string;
  layer: BusinessRuleLayer;
  path?: string;
  op?: BusinessRuleOp;
  expected?: unknown;
  assertFn?: string;
  parseStatus: "parsed" | "unmapped";
  reason: string;
}

export interface RuleGapsReportArtifact {
  schemaVersion: "05g-rule-gaps-report-v1";
  productId: string;
  provider: LlmReportProvider;
  inputCount: number;
  resolvedCount: number;
  remainingCount: number;
  resolutions: RuleGapResolution[];
}
