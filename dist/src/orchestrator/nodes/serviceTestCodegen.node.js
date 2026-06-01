import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step10ServiceTestCodegen } from "../../pipelines/codegen/step-10-service-test-codegen.js";
export async function serviceTestCodegenNode(state, artifactStore) {
    const apiContracts = await artifactStore.readJson(state.runId, "02-api-contracts.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const apiCodegenReport = await artifactStore.readJson(state.runId, "09-api-codegen-report.json");
    const stepMap = await loadProductStepMap(state.productId);
    const report = await step10ServiceTestCodegen({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        apiContracts,
        repoIndex,
        apiCodegenReport,
        stepMap
    });
    const artifactName = "10-service-test-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
