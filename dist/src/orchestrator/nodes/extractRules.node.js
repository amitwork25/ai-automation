import { step5dBusinessRules } from "../../pipelines/rules/step-5d-business-rules.js";
export async function extractRulesNode(state, artifactStore) {
    const manualCases = await artifactStore.readJson(state.runId, "01b-manual-test-cases.json");
    const journeySpec = await artifactStore.readJson(state.runId, "04-journey-spec.json");
    const businessRules = step5dBusinessRules({
        productId: state.productId,
        manualCases,
        journeySpec
    });
    const artifactName = "05-business-rules.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, businessRules);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        },
        flags: {
            unmappedRuleCount: businessRules.unmappedRules.length,
            pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
            linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
            serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
        }
    };
}
