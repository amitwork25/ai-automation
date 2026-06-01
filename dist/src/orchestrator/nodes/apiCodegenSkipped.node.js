import { step9ApiCodegenStub } from "../../pipelines/codegen/step-9-api-codegen-stub.js";
/** Step 9 skipped — writes report-only stub, no framework files. */
export async function apiCodegenSkippedNode(state, artifactStore) {
    const apiContracts = await artifactStore.readJson(state.runId, "02-api-contracts.json");
    const report = step9ApiCodegenStub({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        apiContracts,
        reason: "step 9 excluded — API services not generated into framework"
    });
    const artifactName = "09-api-codegen-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
