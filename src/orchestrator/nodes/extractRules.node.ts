import type { JourneySpecArtifact, ManualTestCasesArtifact } from "../../contracts/pipeline.js";
import { step5dBusinessRules } from "../../pipelines/rules/step-5d-business-rules.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function extractRulesNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const manualCases = await artifactStore.readJson<ManualTestCasesArtifact>(
    state.runId,
    "01b-manual-test-cases.json"
  );
  const journeySpec = await artifactStore.readJson<JourneySpecArtifact>(
    state.runId,
    "04-journey-spec.json"
  );

  const businessRules = step5dBusinessRules({
    productId: state.productId,
    manualCases,
    journeySpec
  });

  const artifactName = "05-business-rules.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, businessRules);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    },
    flags: {
      unmappedRuleCount: businessRules.unmappedRules.length,
      pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
      linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
      serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
    }
  };
}
