import { step3bVectorRetrieve } from "../../pipelines/vector/step-3b-vector-retrieve.js";
export async function vectorRetrieveNode(state, artifactStore) {
    const [manualCases, indexReport] = await Promise.all([
        artifactStore.readJson(state.runId, "01b-manual-test-cases.json"),
        artifactStore.readJson(state.runId, "03a-index-report.json")
    ]);
    const retrieval = step3bVectorRetrieve({
        productId: state.productId,
        manualCases,
        indexReport
    });
    const artifactName = "03b-retrieval-context.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, retrieval);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
