import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  ApiContractsArtifact,
  BusinessRulesArtifact,
  JourneySpecArtifact,
  LlmReportProvider,
  ServiceTestCodegenReportArtifact,
  ServiceTestLlmReportArtifact
} from "../../contracts/pipeline.js";
import { resolveLlmProvider } from "../../config/llm.config.js";
import { isLlmQuotaOrRateLimitError, llmFailOpen } from "../../infrastructure/llm/llm-call-errors.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import { apiMethodBaseName, apiServiceClassName, serviceSpecRelativePath } from "./api-naming.js";
import { writeTextFile } from "./file-writer.js";
import type { AutomationCodegenMode } from "../../config/automation-codegen-mode.js";
import { parseAutomationCodegenMode } from "../../config/automation-codegen-mode.js";
import type { IServiceTestLlmClient, ServiceTestLlmApiContext } from "../../ports/IServiceTestLlmClient.js";

function collectJourneyApiIds(journeySpec: JourneySpecArtifact): Set<string> {
  const ids = new Set<string>();
  for (const journey of journeySpec.journeys) {
    journey.apiSequence.forEach((apiId) => ids.add(apiId));
    journey.stepMappings.forEach((mapping) => mapping.apiIds.forEach((apiId) => ids.add(apiId)));
  }
  return ids;
}

function rulesForApi(businessRules: BusinessRulesArtifact, apiId: string) {
  return businessRules.rules.filter(
    (rule) =>
      rule.apiIds?.includes(apiId) ||
      (rule.layer === "service" && rule.path?.split(".")[0] === apiId.split(".").pop())
  );
}

function mergeSpecContent(smokeSpec: string, additionalTests: string): string {
  const extra = additionalTests.trim();
  if (!extra) {
    return smokeSpec;
  }
  if (smokeSpec.includes(extra)) {
    return smokeSpec;
  }
  return `${smokeSpec.trimEnd()}\n\n/** LLM-enriched cases from manual TC rules */\n${extra}\n`;
}

function resolveTargetApiIds(
  mode: AutomationCodegenMode,
  journeySpec: JourneySpecArtifact,
  generatedApiIds: Set<string>
): Set<string> {
  if (parseAutomationCodegenMode(mode) === "api") {
    return generatedApiIds;
  }
  const journeyApiIds = collectJourneyApiIds(journeySpec);
  return new Set([...journeyApiIds].filter((apiId) => generatedApiIds.has(apiId)));
}

export async function step10bServiceTestLlm(input: {
  productId: string;
  codegenRoot: string;
  journeySpec: JourneySpecArtifact;
  businessRules: BusinessRulesArtifact;
  apiContracts: ApiContractsArtifact;
  serviceTestReport: ServiceTestCodegenReportArtifact;
  stepMap: ProductStepMapConfig;
  llmClient: IServiceTestLlmClient;
  automationCodegenMode?: AutomationCodegenMode;
  maxApisPerCall?: number;
}): Promise<ServiceTestLlmReportArtifact> {
  const provider: LlmReportProvider = resolveLlmProvider();
  const mode = parseAutomationCodegenMode(input.automationCodegenMode);
  const generatedApiIds = new Set(input.serviceTestReport.generated.map((entry) => entry.apiId));
  const targetApiIds = resolveTargetApiIds(mode, input.journeySpec, generatedApiIds);

  const targets = input.apiContracts.apis.filter((api) => targetApiIds.has(api.apiId));

  if (targets.length === 0) {
    return {
      schemaVersion: "10b-service-test-llm-report-v1",
      productId: input.productId,
      provider,
      inputCount: 0,
      enrichedCount: 0,
      additionalTestCount: 0,
      enrichments: [],
      errors: []
    };
  }

  const apiContexts: ServiceTestLlmApiContext[] = [];
  const errors: ServiceTestLlmReportArtifact["errors"] = [];

  for (const api of targets) {
    const specPath = serviceSpecRelativePath(api.apiId, input.productId);
    const absolutePath = path.join(input.codegenRoot, specPath);
    try {
      const smokeSpec = await readFile(absolutePath, "utf8");
      apiContexts.push({
        apiId: api.apiId,
        method: api.method,
        path: api.path,
        serviceClassName: apiServiceClassName(api.apiId, input.stepMap),
        serviceMethodName: apiMethodBaseName(api.apiId, input.stepMap),
        hasRequestBody:
          ["POST", "PUT", "PATCH"].includes(api.method.toUpperCase()) && Boolean(api.requestSchemaRef),
        smokeSpec,
        relatedRules: rulesForApi(input.businessRules, api.apiId).map((rule) => ({
          ruleId: rule.ruleId,
          text: rule.text,
          layer: rule.layer,
          path: rule.path,
          op: rule.op,
          expected: rule.expected
        }))
      });
    } catch (error) {
      errors.push({
        apiId: api.apiId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const chunkSize = input.maxApisPerCall ?? 8;
  const allEnrichments: ServiceTestLlmReportArtifact["enrichments"] = [];
  let additionalTestCount = 0;

  for (let offset = 0; offset < apiContexts.length; offset += chunkSize) {
    const chunk = apiContexts.slice(offset, offset + chunkSize);
    let enrichments: Awaited<ReturnType<IServiceTestLlmClient["enrichServiceTests"]>>;
    try {
      enrichments = await input.llmClient.enrichServiceTests({
        productId: input.productId,
        apis: chunk
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!llmFailOpen()) {
        throw error;
      }
      return {
        schemaVersion: "10b-service-test-llm-report-v1",
        productId: input.productId,
        provider,
        inputCount: apiContexts.length,
        enrichedCount: allEnrichments.length,
        additionalTestCount,
        enrichments: allEnrichments,
        errors,
        skippedReason: isLlmQuotaOrRateLimitError(error) ? "llm_quota_exceeded" : "llm_call_failed",
        errors: [...errors, { apiId: "*", message }]
      };
    }

    for (const entry of enrichments) {
      const context = chunk.find((api) => api.apiId === entry.apiId);
      if (!context || !entry.additionalTests.trim()) {
        continue;
      }

      const specPath = serviceSpecRelativePath(entry.apiId, input.productId);
      const merged = mergeSpecContent(context.smokeSpec, entry.additionalTests);
      const testBlocks = (entry.additionalTests.match(/test\s*\(/g) || []).length;
      additionalTestCount += Math.max(testBlocks, 1);

      try {
        await writeTextFile({
          outputRoot: input.codegenRoot,
          relativePath: specPath,
          content: merged,
          overwrite: true
        });
        allEnrichments.push({
          apiId: entry.apiId,
          files: [specPath],
          additionalTestCount: Math.max(testBlocks, 1)
        });
      } catch (error) {
        errors.push({
          apiId: entry.apiId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  return {
    schemaVersion: "10b-service-test-llm-report-v1",
    productId: input.productId,
    provider,
    inputCount: apiContexts.length,
    enrichedCount: allEnrichments.length,
    additionalTestCount,
    enrichments: allEnrichments,
    errors
  };
}
