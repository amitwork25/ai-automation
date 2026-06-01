import { step11AssertionCompile } from "../../pipelines/codegen/step-11-assertion-compile.js";
export async function compileAssertionsNode(state, artifactStore) {
    const mappedRules = await artifactStore.readJson(state.runId, "06-business-rules-mapped.json");
    const journeyPlan = await artifactStore.readJson(state.runId, "07-journey-plan.json");
    const repoIndex = await artifactStore.readJson(state.runId, "03-repo-index.json");
    const report = await step11AssertionCompile({
        productId: state.productId,
        codegenRoot: state.codegenRoot,
        mappedRules,
        journeyPlan,
        repoIndex
    });
    const artifactName = "11-assertion-compile-report.json";
    const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
    return {
        artifacts: {
            ...state.artifacts,
            [artifactName]: artifactPath
        },
        flags: {
            unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
            pendingCustomCount: report.pendingCustom.length
        }
    };
}
