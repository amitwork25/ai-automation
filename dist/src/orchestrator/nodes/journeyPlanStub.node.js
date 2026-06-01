import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step7JourneyPlanStub } from "../../pipelines/planner/step-7-journey-plan-stub.js";
export async function journeyPlanStubNode(state, artifactStore) {
    const journeySpec = await artifactStore.readJson(state.runId, "04-journey-spec.json");
    const dependencyGraph = await artifactStore.readJson(state.runId, "02b-dependency-graph.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
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
