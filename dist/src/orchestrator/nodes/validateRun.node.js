import { step15Validation } from "../../pipelines/validate/step-15-validation.js";
export async function validateRunNode(state, artifactStore) {
    const apiCodegenReport = await artifactStore.readJson(state.runId, "09-api-codegen-report.json");
    const serviceTestReport = await artifactStore.readJson(state.runId, "10-service-test-report.json");
    const assertionReport = await artifactStore.readJson(state.runId, "11-assertion-compile-report.json");
    const journeyReport = await artifactStore.readJson(state.runId, "13-journey-codegen-report.json");
    const report = await step15Validation({
        productId: state.productId,
        repoRoot: state.repoRoot,
        codegenRoot: state.codegenRoot,
        runId: state.runId,
        artifactPaths: state.artifacts,
        apiCodegenReport,
        serviceTestReport,
        assertionReport,
        journeyReport
    });
    const artifactName = "15-validation-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
