import type {
  ApiContractsArtifact,
  BusinessRulesArtifact,
  JourneySpecArtifact,
  ServiceTestCodegenReportArtifact
} from "../../contracts/pipeline.js";
import { resolveLlmProvider } from "../../config/llm.config.js";
import { createServiceTestLlmClient } from "../../infrastructure/llm/service-test-llm.client.js";
import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step10bServiceTestLlm } from "../../pipelines/codegen/step-10b-service-test-llm.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function serviceTestLlmEnrichNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const llmClient = createServiceTestLlmClient();
  if (!llmClient) {
    return {
      flags: {
        unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
        pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
        linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
        serviceTestLlmInvoked: false
      }
    };
  }

  const [journeySpec, businessRules, apiContracts, serviceTestReport] = await Promise.all([
    artifactStore.readJson<JourneySpecArtifact>(state.runId, "04-journey-spec.json"),
    artifactStore.readJson<BusinessRulesArtifact>(state.runId, "05-business-rules.json"),
    artifactStore.readJson<ApiContractsArtifact>(state.runId, "02-api-contracts.json"),
    artifactStore.readJson<ServiceTestCodegenReportArtifact>(state.runId, "10-service-test-report.json")
  ]);
  const stepMap = await loadProductStepMap(state.productId);

  let report;
  try {
    report = await step10bServiceTestLlm({
      productId: state.productId,
      codegenRoot: state.codegenRoot,
      journeySpec,
      businessRules,
      apiContracts,
      serviceTestReport,
      stepMap,
      llmClient,
      automationCodegenMode: state.inputs.automationCodegenMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report = {
      schemaVersion: "10b-service-test-llm-report-v1",
      productId: state.productId,
      provider: resolveLlmProvider(),
      inputCount: 0,
      enrichedCount: 0,
      additionalTestCount: 0,
      enrichments: [],
      errors: [{ apiId: "*", message }],
      skippedReason: "llm_call_failed"
    };
  }

  const artifactPath = await artifactStore.writeJson(
    state.runId,
    "10b-service-test-llm-report.json",
    report
  );

  return {
    artifacts: {
      ...state.artifacts,
      "10b-service-test-llm-report.json": artifactPath
    },
    flags: {
      unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
      pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
      linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
      serviceTestLlmInvoked: report.enrichedCount > 0
    }
  };
}
