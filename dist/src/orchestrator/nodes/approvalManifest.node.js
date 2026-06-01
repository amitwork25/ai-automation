import { step18ApprovalManifest } from "../../pipelines/validate/step-18-approval-manifest.js";
export async function approvalManifestNode(state, artifactStore) {
    const businessRules = await artifactStore.readJson(state.runId, "05-business-rules.json");
    const assertionReport = await artifactStore.readJson(state.runId, "11-assertion-compile-report.json");
    const journeySpec = await artifactStore.readJson(state.runId, "04-journey-spec.json");
    let customAssertReport;
    if (state.artifacts["12-custom-assert-report.json"]) {
        customAssertReport = await artifactStore.readJson(state.runId, "12-custom-assert-report.json");
    }
    const manifest = step18ApprovalManifest({
        runId: state.runId,
        productId: state.productId,
        businessRules,
        assertionReport,
        customAssertReport,
        journeySpec
    });
    const artifactName = "18-approval-manifest.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, manifest);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
