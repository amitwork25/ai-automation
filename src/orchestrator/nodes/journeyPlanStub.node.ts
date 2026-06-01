import type {
  DependencyGraphArtifact,
  JourneySpecArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step7JourneyPlanStub } from "../../pipelines/planner/step-7-journey-plan-stub.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function journeyPlanStubNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const journeySpec = await artifactStore.readJson<JourneySpecArtifact>(
    state.runId,
    "04-journey-spec.json"
  );
  const dependencyGraph = await artifactStore.readJson<DependencyGraphArtifact>(
    state.runId,
    "02b-dependency-graph.json"
  );
  const repoIndex = await artifactStore.readJson<RepoIndexArtifact>(
    state.runId,
    "03-repo-index.json"
  );
  const stepMap = await loadProductStepMap(state.productId);

  const journeyPlan = step7JourneyPlanStub({
    productId: state.productId,
    journeySpec,
    dependencyGraph,
    repoIndex,
    stepMap
  });

  const artifactName = "07-journey-plan.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, journeyPlan);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
