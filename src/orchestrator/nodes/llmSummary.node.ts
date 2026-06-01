import type {
  LlmSummaryArtifact,
  LlmStepSummary,
  RuleGapsReportArtifact,
  ServiceTestLlmReportArtifact
} from "../../contracts/pipeline.js";
import { resolveLlmProvider } from "../../config/llm.config.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function llmSummaryNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const provider = resolveLlmProvider();
  const llmConfigured = provider !== "heuristic";
  const artifactNames = await artifactStore.listArtifacts(state.runId);
  const steps: LlmStepSummary[] = [];

  if (artifactNames.includes("04b-linker-llm-report.json")) {
    const report = await artifactStore.readJson<{
      inputCount: number;
      acceptedCount: number;
    }>(state.runId, "04b-linker-llm-report.json");
    steps.push({
      step: "2m-linker-fallback",
      invoked: report.inputCount > 0,
      provider,
      inputCount: report.inputCount,
      outputCount: report.acceptedCount,
      artifact: "04b-linker-llm-report.json"
    });
  } else {
    steps.push({
      step: "2m-linker-fallback",
      invoked: false,
      provider,
      artifact: undefined
    });
  }

  if (artifactNames.includes("05g-rule-gaps-report.json")) {
    const report = await artifactStore.readJson<RuleGapsReportArtifact>(
      state.runId,
      "05g-rule-gaps-report.json"
    );
    steps.push({
      step: "5g-rule-gaps",
      invoked: report.inputCount > 0,
      provider: report.provider,
      inputCount: report.inputCount,
      outputCount: report.resolvedCount,
      artifact: "05g-rule-gaps-report.json"
    });
  } else {
    steps.push({ step: "5g-rule-gaps", invoked: false, provider });
  }

  if (artifactNames.includes("10b-service-test-llm-report.json")) {
    const report = await artifactStore.readJson<ServiceTestLlmReportArtifact>(
      state.runId,
      "10b-service-test-llm-report.json"
    );
    steps.push({
      step: "10b-service-test-enrich",
      invoked: report.inputCount > 0,
      provider: report.provider,
      inputCount: report.inputCount,
      outputCount: report.additionalTestCount,
      artifact: "10b-service-test-llm-report.json"
    });
  } else {
    steps.push({ step: "10b-service-test-enrich", invoked: false, provider });
  }

  if (artifactNames.includes("12-custom-assert-report.json")) {
    steps.push({
      step: "12-custom-asserts",
      invoked: true,
      provider,
      artifact: "12-custom-assert-report.json"
    });
  } else {
    steps.push({ step: "12-custom-asserts", invoked: false, provider });
  }

  const totalLlmCalls = steps.filter((entry) => entry.invoked).length;
  const summary: LlmSummaryArtifact = {
    schemaVersion: "00b-llm-summary-v1",
    productId: state.productId,
    provider,
    llmConfigured,
    totalLlmCalls,
    steps
  };

  const artifactPath = await artifactStore.writeJson(state.runId, "00b-llm-summary.json", summary);
  return {
    artifacts: {
      ...state.artifacts,
      "00b-llm-summary.json": artifactPath
    }
  };
}
