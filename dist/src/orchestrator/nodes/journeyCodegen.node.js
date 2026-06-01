import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step13JourneyCodegen } from "../../pipelines/codegen/step-13-journey-codegen.js";
export async function journeyCodegenNode(state, artifactStore) {
    const journeyPlan = await artifactStore.readJson(state.runId, "07-journey-plan.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const stepMap = await loadProductStepMap(state.productId);
    const report = await step13JourneyCodegen({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        journeyPlan,
        repoIndex,
        stepMap
    });
    const artifactName = "13-journey-codegen-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
