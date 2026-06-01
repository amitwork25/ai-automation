import { step2mLinkJourney } from "../../pipelines/linker/step-2m-link-journey.js";
import { loadApiAliases } from "../../pipelines/rules/load-rule-knowledge.js";
export async function linkJourneyNode(state, artifactStore) {
    const manualCases = await artifactStore.readJson(state.runId, "01b-manual-test-cases.json");
    const apiContracts = await artifactStore.readJson(state.runId, "02-api-contracts.json");
    const dependencyGraph = await artifactStore.readJson(state.runId, "02b-dependency-graph.json");
    const aliases = state.inputs.apiAliases ??
        (await loadApiAliases(state.productId));
    const journeySpec = step2mLinkJourney({
        productId: state.productId,
        manualCases,
        apiContracts,
        dependencyGraph,
        aliases,
        mappingThreshold: state.inputs.mappingThreshold,
        strictMapping: state.inputs.strictMapping
    });
    const artifactName = "04-journey-spec.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, journeySpec);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
