import { step3aVectorIndex } from "../../pipelines/vector/step-3a-vector-index.js";
export async function vectorIndexNode(state, artifactStore) {
    const [manualCases, apiContracts, repoIndex] = await Promise.all([
        artifactStore.readJson(state.runId, "01b-manual-test-cases.json"),
        artifactStore.readJson(state.runId, "02-api-contracts.json"),
        artifactStore.readJson(state.runId, "03-repo-index.json")
    ]);
    const { report } = await step3aVectorIndex({
        productId: state.productId,
        repoRoot: state.repoRoot,
        manualCases,
        apiContracts,
        repoIndex
    });
    const artifactName = "03a-index-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
