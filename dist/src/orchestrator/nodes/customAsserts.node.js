import { createCustomAssertLlmClient } from "../../infrastructure/llm/custom-assert-llm.client.js";
import { step12CustomAsserts } from "../../pipelines/codegen/step-12-custom-asserts.js";
export async function customAssertsNode(state, artifactStore) {
    const mappedRules = await artifactStore.readJson(state.runId, "06-business-rules-mapped.json");
    const businessRules = await artifactStore.readJson(state.runId, "05-business-rules.json");
    const assertionReport = await artifactStore.readJson(state.runId, "11-assertion-compile-report.json");
    const journeyPlan = await artifactStore.readJson(state.runId, "07-journey-plan.json");
    let retrievalContext;
    if (state.artifacts["03b-retrieval-context.json"]) {
        retrievalContext = await artifactStore.readJson(state.runId, "03b-retrieval-context.json");
    }
    const persona = journeyPlan.journeys[0]?.persona || "default_user";
    const useLlm = (state.flags?.pendingCustomCount ?? 0) > 0 && state.inputs.llmProfile !== "minimal";
    const report = await step12CustomAsserts({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        mappedRules,
        businessRules,
        assertionReport,
        persona,
        retrievalContext,
        llmClient: createCustomAssertLlmClient(),
        useLlm
    });
    const artifactName = "12-custom-assert-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        }
    };
}
