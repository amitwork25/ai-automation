import { step14PlaywrightProject } from "../../pipelines/codegen/step-14-playwright-project.js";
export async function playwrightProjectNode(state, artifactStore) {
    const report = await step14PlaywrightProject({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        runId: state.runId
    });
    const artifactName = "14-playwright-project-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
