import type {
  DependencyGraphArtifact,
  JourneyPlanArtifact,
  JourneySpecArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import {
  expandApiSequenceWithDependencies,
  journeyEntryStepBlock,
  resolveStepCall,
  writesForCall,
  writesForCalls
} from "./api-step-mapper.js";

/** Lightweight 07 artifact when step 7 planner is excluded from the run graph. */
export function step7JourneyPlanStub(input: {
  productId: string;
  journeySpec: JourneySpecArtifact;
  dependencyGraph: DependencyGraphArtifact;
  repoIndex: RepoIndexArtifact;
  stepMap: ProductStepMapConfig;
}): JourneyPlanArtifact {
  let totalCalls = 0;
  let resolvedCalls = 0;
  let generateCalls = 0;

  const journeys = input.journeySpec.journeys.map((journey) => {
    const steps: JourneyPlanArtifact["journeys"][number]["steps"] = [];
    let order = 1;

    const entrySteps = journeyEntryStepBlock(input.repoIndex, input.stepMap);
    if (entrySteps.length > 0) {
      const calls = entrySteps.map((call) => {
        totalCalls += 1;
        const inRepo = input.repoIndex.steps.some((entry) => entry.name === call);
        if (inRepo) {
          resolvedCalls += 1;
        } else {
          generateCalls += 1;
        }
        return call;
      });
      steps.push({
        order: order++,
        calls,
        status: calls.every((call) => input.repoIndex.steps.some((entry) => entry.name === call))
          ? "resolved"
          : "generate",
        writes: writesForCalls(calls, input.stepMap)
      });
    }

    const expandedApis = expandApiSequenceWithDependencies(journey.apiSequence, input.dependencyGraph);
    for (const apiId of expandedApis) {
      const { call, status } = resolveStepCall(apiId, input.repoIndex, input.stepMap);
      totalCalls += 1;
      if (status === "resolved") {
        resolvedCalls += 1;
      } else {
        generateCalls += 1;
      }
      steps.push({
        order: order++,
        call,
        apiIds: [apiId],
        status,
        writes: writesForCall(call, input.stepMap)
      });
    }

    return {
      journeyId: journey.journeyId,
      persona: journey.persona,
      sourceCaseIds: journey.sourceCaseIds,
      steps
    };
  });

  return {
    schemaVersion: "07-journey-plan-v1",
    productId: input.productId,
    planner: "stub-v1-step7-excluded",
    journeys,
    planMeta: {
      totalCalls,
      resolvedCalls,
      generateCalls,
      targetMet: totalCalls === 0 || resolvedCalls / totalCalls >= 0.7
    }
  };
}
