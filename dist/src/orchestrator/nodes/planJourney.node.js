import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step7JourneyPlanner } from "../../pipelines/planner/step-7-journey-planner.js";
export async function planJourneyNode(state, artifactStore) {
    const journeySpec = await artifactStore.readJson(state.runId, "04-journey-spec.json");
    const dependencyGraph = await artifactStore.readJson(state.runId, "02b-dependency-graph.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const mappedRules = await artifactStore.readJson(state.runId, "06-business-rules-mapped.json");
    const stepMap = await loadProductStepMap(state.productId);
    const journeyPlan = step7JourneyPlanner({
        productId: state.productId,
        journeySpec,
        dependencyGraph,
        repoIndex,
        mappedRules,
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
