import { createRuleGapLlmClient } from "../../infrastructure/llm/rule-gap-llm.client.js";
import { step5gRuleGaps } from "../../pipelines/rules/step-5g-rule-gaps.js";
export async function rulesLlmGapsNode(state, artifactStore) {
    const businessRules = await artifactStore.readJson(state.runId, "05-business-rules.json");
    let retrievalContext;
    if (state.artifacts["03b-retrieval-context.json"]) {
        retrievalContext = await artifactStore.readJson(state.runId, "03b-retrieval-context.json");
    }
    const { businessRules: patchedRules, report } = await step5gRuleGaps({
        productId: state.productId,
        businessRules,
        retrievalContext,
        llmClient: createRuleGapLlmClient()
    });
    const rulesPath = await artifactStore.writeJson(state.runId, "05-business-rules.json", patchedRules);
    const reportPath = await artifactStore.writeJson(state.runId, "05g-rule-gaps-report.json", report);
    return {
        artifacts: {
            ...state.artifacts,
            "05-business-rules.json": rulesPath,
            "05g-rule-gaps-report.json": reportPath
        },
        flags: {
            unmappedRuleCount: report.remainingCount,
            pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
            linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
            serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
        }
    };
}
