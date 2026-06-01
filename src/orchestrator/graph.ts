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
import { serviceTestLlmEnrichNode } from "./nodes/serviceTestLlmEnrich.node.js";
import { llmSummaryNode } from "./nodes/llmSummary.node.js";
import { traceabilityNode } from "./nodes/traceability.node.js";
import { validateRunNode } from "./nodes/validateRun.node.js";
import { vectorIndexNode } from "./nodes/vectorIndex.node.js";
import { vectorRetrieveNode } from "./nodes/vectorRetrieve.node.js";
import {
  includeApiLayer,
  includeJourneyLayer,
  parseAutomationCodegenMode
} from "../config/automation-codegen-mode.js";
import type { IArtifactStore } from "../ports/IArtifactStore.js";
import type { RunResult, RunState } from "./state.js";

const RunStateAnnotation = Annotation.Root({
  runId: Annotation<string>,
  productId: Annotation<string>,
  repoRoot: Annotation<string>,
  codegenRoot: Annotation<string>,
  inputs: Annotation<RunState["inputs"]>,
  artifacts: Annotation<Record<string, string>>,
  errors: Annotation<string[]>,
  status: Annotation<RunState["status"]>,
  flags: Annotation<RunState["flags"]>
});

export interface RunGraphDependencies {
  artifactStore: IArtifactStore;
  runsDir?: string;
}

function shouldRunRuleGaps(state: RunState): boolean {
  return (state.flags?.unmappedRuleCount ?? 0) > 0;
}

function shouldRunCustomAsserts(state: RunState): boolean {
  return (state.flags?.pendingCustomCount ?? 0) > 0;
}

function shouldEnrichServiceTests(state: RunState): boolean {
  return state.inputs.llmProfile !== "minimal";
}

function automationCodegenMode(state: RunState) {
  return parseAutomationCodegenMode(state.inputs.automationCodegenMode);
}

export function createRunGraph(deps: RunGraphDependencies) {
  const graph = new StateGraph(RunStateAnnotation)
    .addNode("bootstrap", async (state: RunState) => {
      const runsDir = deps.runsDir ?? defaultRunsDir();
      const codegenRoot = state.codegenRoot || resolveCodegenRoot(runsDir, state.runId);
      await mkdir(codegenRoot, { recursive: true });

      const artifactName = "00-run-meta.json";
      const artifactPath = await deps.artifactStore.writeJson(state.runId, artifactName, {
        runId: state.runId,
        productId: state.productId,
        repoRoot: state.repoRoot,
        codegenRoot,
        automationCodegenMode: automationCodegenMode(state),
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
    .addNode("ingestManualTc", async (state: RunState) => ingestManualTcNode(state, deps.artifactStore))
    .addNode("ingestApiContracts", async (state: RunState) =>
      ingestApiContractsNode(state, deps.artifactStore)
    )
    .addNode("linkJourney", async (state: RunState) => linkJourneyNode(state, deps.artifactStore))
    .addNode("repoIndex", async (state: RunState) => repoIndexNode(state, deps.artifactStore))
    .addNode("incrementalDiff", async (state: RunState) => incrementalDiffNode(state, deps.artifactStore))
    .addNode("vectorIndex", async (state: RunState) => vectorIndexNode(state, deps.artifactStore))
    .addNode("vectorRetrieve", async (state: RunState) => vectorRetrieveNode(state, deps.artifactStore))
    .addNode("extractRules", async (state: RunState) => extractRulesNode(state, deps.artifactStore))
    .addNode("rulesLlmGaps", async (state: RunState) => rulesLlmGapsNode(state, deps.artifactStore))
    .addNode("mapRules", async (state: RunState) => mapRulesNode(state, deps.artifactStore))
    .addNode("apiCodegen", async (state: RunState) => apiCodegenNode(state, deps.artifactStore))
    .addNode("serviceTestCodegen", async (state: RunState) =>
      serviceTestCodegenNode(state, deps.artifactStore)
    )
    .addNode("serviceTestLlmEnrich", async (state: RunState) =>
      serviceTestLlmEnrichNode(state, deps.artifactStore)
    )
    .addNode("planJourney", async (state: RunState) => planJourneyNode(state, deps.artifactStore))
    .addNode("compileAssertions", async (state: RunState) =>
      compileAssertionsNode(state, deps.artifactStore)
    )
    .addNode("journeyCodegen", async (state: RunState) => journeyCodegenNode(state, deps.artifactStore))
    .addNode("customAsserts", async (state: RunState) => customAssertsNode(state, deps.artifactStore))
    .addNode("validateRun", async (state: RunState) => validateRunNode(state, deps.artifactStore))
    .addNode("playwrightProject", async (state: RunState) =>
      playwrightProjectNode(state, deps.artifactStore)
    )
    .addNode("reviewRun", async (state: RunState) => reviewRunNode(state, deps.artifactStore))
    .addNode("traceability", async (state: RunState) => traceabilityNode(state, deps.artifactStore))
    .addNode("llmSummary", async (state: RunState) => llmSummaryNode(state, deps.artifactStore))
    .addNode("approvalManifest", async (state: RunState) => approvalManifestNode(state, deps.artifactStore))
    .addNode("markCompleted", async () => ({
      status: "completed" as const
    }))
    .addNode("markFailed", async (state: RunState) => ({
      status: "failed" as const,
      errors: [...state.errors]
    }))
    .addEdge(START, "bootstrap")
    .addEdge("bootstrap", "ingestManualTc")
    .addEdge("ingestManualTc", "ingestApiContracts")
    .addEdge("ingestApiContracts", "linkJourney")
    .addConditionalEdges(
      "linkJourney",
      (state: RunState) => (state.errors.length > 0 ? "failed" : "continue"),
      {
        failed: "markFailed",
        continue: "repoIndex"
      }
    )
    .addConditionalEdges(
      "repoIndex",
      (state: RunState) => (state.errors.length > 0 ? "failed" : "continue"),
      {
        failed: "markFailed",
        continue: "incrementalDiff"
      }
    )
    .addConditionalEdges(
      "incrementalDiff",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        return state.inputs.useVectorRetrieval ? "vector" : "rules";
      },
      {
        failed: "markFailed",
        vector: "vectorIndex",
        rules: "extractRules"
      }
    )
    .addEdge("vectorIndex", "vectorRetrieve")
    .addEdge("vectorRetrieve", "extractRules")
    .addConditionalEdges(
      "extractRules",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        return shouldRunRuleGaps(state) ? "gaps" : "map";
      },
      {
        failed: "markFailed",
        gaps: "rulesLlmGaps",
        map: "mapRules"
      }
    )
    .addEdge("rulesLlmGaps", "mapRules")
    .addConditionalEdges(
      "mapRules",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        const mode = automationCodegenMode(state);
        if (includeJourneyLayer(mode) && !includeApiLayer(mode)) {
          return "journey";
        }
        return "api";
      },
      {
        failed: "markFailed",
        journey: "planJourney",
        api: "apiCodegen"
      }
    )
    .addConditionalEdges(
      "apiCodegen",
      (state: RunState) => (state.errors.length > 0 ? "failed" : "continue"),
      {
        failed: "markFailed",
        continue: "serviceTestCodegen"
      }
    )
    .addConditionalEdges(
      "serviceTestCodegen",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        if (shouldEnrichServiceTests(state)) {
          return "enrich";
        }
        return includeJourneyLayer(automationCodegenMode(state)) ? "journey" : "playwright";
      },
      {
        failed: "markFailed",
        enrich: "serviceTestLlmEnrich",
        journey: "planJourney",
        playwright: "playwrightProject"
      }
    )
    .addConditionalEdges(
      "serviceTestLlmEnrich",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        return includeJourneyLayer(automationCodegenMode(state)) ? "journey" : "playwright";
      },
      {
        failed: "markFailed",
        journey: "planJourney",
        playwright: "playwrightProject"
      }
    )
    .addEdge("planJourney", "compileAssertions")
    .addConditionalEdges(
      "compileAssertions",
      (state: RunState) => {
        if (state.errors.length > 0) {
          return "failed";
        }
        return shouldRunCustomAsserts(state) ? "custom" : "journey";
      },
      {
        failed: "markFailed",
        custom: "customAsserts",
        journey: "journeyCodegen"
      }
    )
    .addEdge("customAsserts", "journeyCodegen")
    .addConditionalEdges(
      "journeyCodegen",
      (state: RunState) => (state.errors.length > 0 ? "failed" : "continue"),
      {
        failed: "markFailed",
        continue: "playwrightProject"
      }
    )
    .addEdge("playwrightProject", "validateRun")
    .addEdge("validateRun", "traceability")
    .addEdge("traceability", "llmSummary")
    .addEdge("llmSummary", "approvalManifest")
    .addEdge("approvalManifest", "reviewRun")
    .addConditionalEdges(
      "reviewRun",
      (state: RunState) => (state.errors.length > 0 ? "failed" : "completed"),
      {
        failed: "markFailed",
        completed: "markCompleted"
      }
    )
    .addEdge("markCompleted", END)
    .addEdge("markFailed", END);

  return graph.compile();
}

export async function executeRunGraph(
  deps: RunGraphDependencies,
  initialState: RunState
): Promise<RunResult> {
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
