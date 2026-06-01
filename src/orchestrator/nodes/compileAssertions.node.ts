import type { BusinessRulesMappedArtifact, JourneyPlanArtifact, RepoIndexArtifact } from "../../contracts/pipeline.js";
import { step11AssertionCompile } from "../../pipelines/codegen/step-11-assertion-compile.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function compileAssertionsNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const mappedRules = await artifactStore.readJson<BusinessRulesMappedArtifact>(
    state.runId,
    "06-business-rules-mapped.json"
  );
  const journeyPlan = await artifactStore.readJson<JourneyPlanArtifact>(
    state.runId,
    "07-journey-plan.json"
  );
  const repoIndex = await artifactStore.readJson<RepoIndexArtifact>(
    state.runId,
    "03-repo-index.json"
  );

  const report = await step11AssertionCompile({
    productId: state.productId,
    codegenRoot: state.codegenRoot,
    mappedRules,
    journeyPlan,
    repoIndex
  });

  const artifactName = "11-assertion-compile-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    },
    flags: {
      unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
      pendingCustomCount: report.pendingCustom.length,
      linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
      serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
    }
  };
}
