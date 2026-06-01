import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step9ApiCodegen } from "../../pipelines/codegen/step-9-api-codegen.js";
export async function apiCodegenNode(state, artifactStore) {
    const apiContracts = await artifactStore.readJson(state.runId, "02-api-contracts.json");
    const schemaIndex = await artifactStore.readJson(state.runId, "02c-schema-index.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const stepMap = await loadProductStepMap(state.productId);
    const report = await step9ApiCodegen({
        productId: state.productId,
        repoRoot: state.repoRoot,
        codegenRoot: state.codegenRoot,
        apiContracts,
        schemaIndex,
        repoIndex,
        stepMap
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
