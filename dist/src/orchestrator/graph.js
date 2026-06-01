import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { mkdir } from "node:fs/promises";
import { resolveCodegenRoot, defaultRunsDir } from "../pipelines/codegen/codegen-output-root.js";
import { approvalManifestNode } from "./nodes/approvalManifest.node.js";
import { apiCodegenNode } from "./nodes/apiCodegen.node.js";
import { compileAssertionsNode } from "./nodes/compileAssertions.node.js";
import { customAssertsNode } from "./nodes/customAsserts.node.js";
import { extractRulesNode } from "./nodes/extractRules.node.js";
import { incrementalDiffNode } from "./nodes/incrementalDiff.node.js";
import { ingestApiContractsNode } from "./nodes/ingestApiContracts.node.js";
import { ingestManualTcNode } from "./nodes/ingestManualTc.node.js";
import { journeyCodegenNode } from "./nodes/journeyCodegen.node.js";
import { planJourneyNode } from "./nodes/planJourney.node.js";
import { linkJourneyNode } from "./nodes/linkJourney.node.js";
import { mapRulesNode } from "./nodes/mapRules.node.js";
import { playwrightProjectNode } from "./nodes/playwrightProject.node.js";
import { reviewRunNode } from "./nodes/reviewRun.node.js";
import { repoIndexNode } from "./nodes/repoIndex.node.js";
import { rulesLlmGapsNode } from "./nodes/rulesLlmGaps.node.js";
import { serviceTestCodegenNode } from "./nodes/serviceTestCodegen.node.js";
import { traceabilityNode } from "./nodes/traceability.node.js";
import { validateRunNode } from "./nodes/validateRun.node.js";
import { vectorIndexNode } from "./nodes/vectorIndex.node.js";
import { vectorRetrieveNode } from "./nodes/vectorRetrieve.node.js";
const RunStateAnnotation = Annotation.Root({
    runId: (Annotation),
    productId: (Annotation),
    repoRoot: (Annotation),
    codegenRoot: (Annotation),
    inputs: (Annotation),
    artifacts: (Annotation),
    errors: (Annotation),
    status: (Annotation),
    flags: (Annotation)
});
function shouldRunRuleGaps(state) {
    return (state.flags?.unmappedRuleCount ?? 0) > 0;
}
function shouldRunCustomAsserts(state) {
    return (state.flags?.pendingCustomCount ?? 0) > 0;
}
export function createRunGraph(deps) {
    const graph = new StateGraph(RunStateAnnotation)
        .addNode("bootstrap", async (state) => {
        const runsDir = deps.runsDir ?? defaultRunsDir();
        const codegenRoot = state.codegenRoot || resolveCodegenRoot(runsDir, state.runId);
        await mkdir(codegenRoot, { recursive: true });
        const artifactName = "00-run-meta.json";
        const artifactPath = await deps.artifactStore.writeJson(state.runId, artifactName, {
            runId: state.runId,
            productId: state.productId,
            repoRoot: state.repoRoot,
            codegenRoot,
            createdAt: new Date().toISOString()
        });
        return {
            codegenRoot,
            artifacts: {
                ...state.artifacts,
                [artifactName]: artifactPath
            }
        };
    })
        .addNode("ingestManualTc", async (state) => ingestManualTcNode(state, deps.artifactStore))
        .addNode("ingestApiContracts", async (state) => ingestApiContractsNode(state, deps.artifactStore))
        .addNode("linkJourney", async (state) => linkJourneyNode(state, deps.artifactStore))
        .addNode("repoIndex", async (state) => repoIndexNode(state, deps.artifactStore))
        .addNode("incrementalDiff", async (state) => incrementalDiffNode(state, deps.artifactStore))
        .addNode("vectorIndex", async (state) => vectorIndexNode(state, deps.artifactStore))
        .addNode("vectorRetrieve", async (state) => vectorRetrieveNode(state, deps.artifactStore))
        .addNode("extractRules", async (state) => extractRulesNode(state, deps.artifactStore))
        .addNode("rulesLlmGaps", async (state) => rulesLlmGapsNode(state, deps.artifactStore))
        .addNode("mapRules", async (state) => mapRulesNode(state, deps.artifactStore))
        .addNode("apiCodegen", async (state) => apiCodegenNode(state, deps.artifactStore))
        .addNode("serviceTestCodegen", async (state) => serviceTestCodegenNode(state, deps.artifactStore))
        .addNode("planJourney", async (state) => planJourneyNode(state, deps.artifactStore))
        .addNode("compileAssertions", async (state) => compileAssertionsNode(state, deps.artifactStore))
        .addNode("journeyCodegen", async (state) => journeyCodegenNode(state, deps.artifactStore))
        .addNode("customAsserts", async (state) => customAssertsNode(state, deps.artifactStore))
        .addNode("validateRun", async (state) => validateRunNode(state, deps.artifactStore))
        .addNode("playwrightProject", async (state) => playwrightProjectNode(state, deps.artifactStore))
        .addNode("reviewRun", async (state) => reviewRunNode(state, deps.artifactStore))
        .addNode("traceability", async (state) => traceabilityNode(state, deps.artifactStore))
        .addNode("approvalManifest", async (state) => approvalManifestNode(state, deps.artifactStore))
        .addNode("markCompleted", async () => ({
        status: "completed"
    }))
        .addNode("markFailed", async (state) => ({
        status: "failed",
        errors: [...state.errors]
    }))
        .addEdge(START, "bootstrap")
        .addEdge("bootstrap", "ingestManualTc")
        .addEdge("ingestManualTc", "ingestApiContracts")
        .addEdge("ingestApiContracts", "linkJourney")
        .addConditionalEdges("linkJourney", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "repoIndex"
    })
        .addConditionalEdges("repoIndex", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "incrementalDiff"
    })
        .addConditionalEdges("incrementalDiff", (state) => {
        if (state.errors.length > 0) {
            return "failed";
        }
        return state.inputs.useVectorRetrieval ? "vector" : "rules";
    }, {
        failed: "markFailed",
        vector: "vectorIndex",
        rules: "extractRules"
    })
        .addEdge("vectorIndex", "vectorRetrieve")
        .addEdge("vectorRetrieve", "extractRules")
        .addConditionalEdges("extractRules", (state) => {
        if (state.errors.length > 0) {
            return "failed";
        }
        return shouldRunRuleGaps(state) ? "gaps" : "map";
    }, {
        failed: "markFailed",
        gaps: "rulesLlmGaps",
        map: "mapRules"
    })
        .addEdge("rulesLlmGaps", "mapRules")
        .addConditionalEdges("mapRules", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "apiCodegen"
    })
        .addConditionalEdges("apiCodegen", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "serviceTestCodegen"
    })
        .addConditionalEdges("serviceTestCodegen", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "planJourney"
    })
        .addEdge("planJourney", "compileAssertions")
        .addConditionalEdges("compileAssertions", (state) => {
        if (state.errors.length > 0) {
            return "failed";
        }
        return shouldRunCustomAsserts(state) ? "custom" : "journey";
    }, {
        failed: "markFailed",
        custom: "customAsserts",
        journey: "journeyCodegen"
    })
        .addEdge("customAsserts", "journeyCodegen")
        .addConditionalEdges("journeyCodegen", (state) => (state.errors.length > 0 ? "failed" : "continue"), {
        failed: "markFailed",
        continue: "playwrightProject"
    })
        .addEdge("playwrightProject", "validateRun")
        .addEdge("validateRun", "traceability")
        .addEdge("traceability", "approvalManifest")
        .addEdge("approvalManifest", "reviewRun")
        .addConditionalEdges("reviewRun", (state) => (state.errors.length > 0 ? "failed" : "completed"), {
        failed: "markFailed",
        completed: "markCompleted"
    })
        .addEdge("markCompleted", END)
        .addEdge("markFailed", END);
    return graph.compile();
}
export async function executeRunGraph(deps, initialState) {
    const runGraph = createRunGraph(deps);
    const finalState = await runGraph.invoke(initialState);
    return {
        runId: finalState.runId,
        productId: finalState.productId,
        repoRoot: finalState.repoRoot,
        codegenRoot: finalState.codegenRoot,
        artifacts: finalState.artifacts,
        errors: finalState.errors,
        status: finalState.status
    };
}
