import type {
  ApiAliasesConfig,
  ApiContractsArtifact,
  DependencyGraphArtifact,
  JourneySpecArtifact,
  LinkerLlmReportArtifact,
  ManualTestCasesArtifact
} from "../../contracts/pipeline.js";
import { resolveLlmProvider } from "../../config/llm.config.js";
import { createLinkerFallbackLlmClient } from "../../infrastructure/llm/linker-fallback-llm.client.js";
import { isLlmQuotaOrRateLimitError, llmFailOpen } from "../../infrastructure/llm/llm-call-errors.js";
import { applyLinkerLlmFallback } from "../../pipelines/linker/apply-linker-llm-fallback.js";
import { step2mLinkJourney } from "../../pipelines/linker/step-2m-link-journey.js";
import { loadApiAliases } from "../../pipelines/rules/load-rule-knowledge.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function linkJourneyNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const manualCases = await artifactStore.readJson<ManualTestCasesArtifact>(
    state.runId,
    "01b-manual-test-cases.json"
  );
  const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
    state.runId,
    "02-api-contracts.json"
  );
  const dependencyGraph = await artifactStore.readJson<DependencyGraphArtifact>(
    state.runId,
    "02b-dependency-graph.json"
  );
  const aliases =
    (state.inputs.apiAliases as ApiAliasesConfig | undefined) ??
    (await loadApiAliases(state.productId));

  let journeySpec = step2mLinkJourney({
    productId: state.productId,
    manualCases,
    apiContracts,
    dependencyGraph,
    aliases,
    mappingThreshold: state.inputs.mappingThreshold,
    strictMapping: state.inputs.strictMapping
  });

  let linkerLlmInvoked = false;
  const llmClient = createLinkerFallbackLlmClient();
  const useLinkerLlm = state.inputs.llmProfile !== "minimal" && llmClient !== null;

  const artifacts: Record<string, string> = { ...state.artifacts };

  if (useLinkerLlm && journeySpec.unmapped.length > 0) {
    const unmappedInputCount = journeySpec.unmapped.length;
    const journeyContext = journeySpec.journeys.map((journey) => ({
      caseId: journey.sourceCaseIds[0] ?? "",
      mappedApiIds: journey.apiSequence
    }));

    try {
      const { mappings, modelUsed } = await llmClient.mapUnmappedSteps({
        productId: state.productId,
        unmappedSteps: journeySpec.unmapped,
        apiCatalog: apiContracts.apis.map((api) => ({
          apiId: api.apiId,
          method: api.method,
          path: api.path,
          title: api.title,
          operationId: api.operationId
        })),
        journeyContext
      });

      const accepted = mappings.filter((entry) => entry.apiIds.length > 0 && entry.confidence >= 0.7);
      journeySpec = applyLinkerLlmFallback({
        journeySpec,
        mappings,
        dependencyGraph,
        mappingThreshold: state.inputs.mappingThreshold
      });

      linkerLlmInvoked = accepted.length > 0;
      const linkerReport: LinkerLlmReportArtifact = {
        schemaVersion: "04b-linker-llm-report-v1",
        productId: state.productId,
        provider: resolveLlmProvider(),
        inputCount: unmappedInputCount,
        acceptedCount: accepted.length,
        mappings,
        modelUsed
      };
      artifacts["04b-linker-llm-report.json"] = await artifactStore.writeJson(
        state.runId,
        "04b-linker-llm-report.json",
        linkerReport
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const quotaHit = isLlmQuotaOrRateLimitError(error);

      if (!llmFailOpen() && !quotaHit) {
        throw error;
      }

      const linkerReport: LinkerLlmReportArtifact = {
        schemaVersion: "04b-linker-llm-report-v1",
        productId: state.productId,
        provider: resolveLlmProvider(),
        inputCount: unmappedInputCount,
        acceptedCount: 0,
        mappings: [],
        skippedReason: quotaHit ? "llm_quota_exceeded" : "llm_call_failed",
        error: message
      };
      artifacts["04b-linker-llm-report.json"] = await artifactStore.writeJson(
        state.runId,
        "04b-linker-llm-report.json",
        linkerReport
      );
    }
  }

  const artifactName = "04-journey-spec.json";
  artifacts[artifactName] = await artifactStore.writeJson(state.runId, artifactName, journeySpec);

  return {
    artifacts,
    flags: {
      unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
      pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
      linkerLlmInvoked,
      serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
    }
  };
}
