import { step16Review } from "../../pipelines/validate/step-16-review.js";
export async function reviewRunNode(state, artifactStore) {
    const validationReport = await artifactStore.readJson(state.runId, "15-validation-report.json");
    const approvalManifest = await artifactStore.readJson(state.runId, "18-approval-manifest.json");
    const report = step16Review({
        productId: state.productId,
        runId: state.runId,
        validationReport,
        approvalManifest
    });
    const artifactName = "16-review-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
