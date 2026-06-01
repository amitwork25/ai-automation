import type {
  BusinessRulesArtifact,
  VectorRetrievalContextArtifact
} from "../../contracts/pipeline.js";
import { createRuleGapLlmClient } from "../../infrastructure/llm/rule-gap-llm.client.js";
import { step5gRuleGaps } from "../../pipelines/rules/step-5g-rule-gaps.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function rulesLlmGapsNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const businessRules = await artifactStore.readJson<BusinessRulesArtifact>(
    state.runId,
    "05-business-rules.json"
  );

  let retrievalContext: VectorRetrievalContextArtifact | undefined;
  if (state.artifacts["03b-retrieval-context.json"]) {
    retrievalContext = await artifactStore.readJson<VectorRetrievalContextArtifact>(
      state.runId,
      "03b-retrieval-context.json"
    );
  }

  const { businessRules: patchedRules, report } = await step5gRuleGaps({
    productId: state.productId,
    businessRules,
    retrievalContext,
    llmClient: createRuleGapLlmClient()
  });

  const rulesPath = await artifactStore.writeJson(state.runId, "05-business-rules.json", patchedRules);
  const reportPath = await artifactStore.writeJson(state.runId, "05g-rule-gaps-report.json", report);

  return {
    artifacts: {
      ...state.artifacts,
      "05-business-rules.json": rulesPath,
      "05g-rule-gaps-report.json": reportPath
    },
    flags: {
      unmappedRuleCount: report.remainingCount,
      pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
      linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
      serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
    }
  };
}
