import { step17Traceability } from "../../pipelines/validate/step-17-traceability.js";
export async function traceabilityNode(state, artifactStore) {
    const manualCases = await artifactStore.readJson(state.runId, "01b-manual-test-cases.json");
    const businessRules = await artifactStore.readJson(state.runId, "05-business-rules.json");
    const mappedRules = await artifactStore.readJson(state.runId, "06-business-rules-mapped.json");
    const journeySpec = await artifactStore.readJson(state.runId, "04-journey-spec.json");
    const journeyPlan = await artifactStore.readJson(state.runId, "07-journey-plan.json");
    const { artifact, markdown } = step17Traceability({
        runId: state.runId,
        productId: state.productId,
        manualCases,
        businessRules,
        mappedRules,
        journeySpec,
        journeyPlan
    });
    const jsonPath = await artifactStore.writeJson(state.runId, "17-traceability.json", artifact);
    const mdPath = await artifactStore.writeText(state.runId, "17-traceability.md", markdown);
    return {
        artifacts: {
            ...state.artifacts,
            "17-traceability.json": jsonPath,
            "17-traceability.md": mdPath
        }
    };
}
