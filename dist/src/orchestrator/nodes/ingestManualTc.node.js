import { adaptManualTestCases } from "../../adapters/manual-test-case.adapter.js";
import { step1bManualTestCases } from "../../pipelines/ingest/step-1b-manual-test-cases.js";
export async function ingestManualTcNode(state, artifactStore) {
    const artifactName = "01b-manual-test-cases.json";
    const normalizedCases = adaptManualTestCases(state.inputs.manualTestCases, state.productId);
    const manualCases = step1bManualTestCases({
        productId: state.productId,
        rawCases: normalizedCases
    });
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, manualCases);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
