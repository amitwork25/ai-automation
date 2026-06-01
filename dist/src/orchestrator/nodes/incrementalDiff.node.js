import { step3dIncrementalDiff } from "../../pipelines/ingest/step-3d-incremental-diff.js";
export async function incrementalDiffNode(state, artifactStore) {
    if (state.inputs.mode !== "incremental") {
        return { artifacts: state.artifacts };
    }
    const apiContracts = await artifactStore.readJson(state.runId, "02-api-contracts.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const diff = step3dIncrementalDiff({
        productId: state.productId,
        apiContracts,
        repoIndex
    });
    const artifactName = "03d-incremental-diff.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, diff);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
