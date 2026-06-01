import type {
  BusinessRulesMappedArtifact,
  DependencyGraphArtifact,
  JourneyPlanArtifact,
  JourneySpecArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import {
  defaultCheckpointAssert,
  expandApiSequenceWithDependencies,
  journeyEntryStepBlock,
  resolveStepCall,
  writesForCall,
  writesForCalls
} from "./api-step-mapper.js";

function journeyAssertFunctionName(journeyId: string): string {
  const slug = journeyId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `assert${slug}Contracts`;
}

export function step7JourneyPlanner(input: {
  productId: string;
  journeySpec: JourneySpecArtifact;
  dependencyGraph: DependencyGraphArtifact;
  repoIndex: RepoIndexArtifact;
  mappedRules: BusinessRulesMappedArtifact;
  stepMap: ProductStepMapConfig;
}): JourneyPlanArtifact {
  void input.mappedRules;

  let totalCalls = 0;
  let resolvedCalls = 0;
  let generateCalls = 0;

  const journeys = input.journeySpec.journeys.map((journey) => {
    const steps: JourneyPlanArtifact["journeys"][number]["steps"] = [];
    let order = 1;

    const entrySteps = journeyEntryStepBlock(input.repoIndex, input.stepMap);
    if (entrySteps.length > 0) {
      const resolved = entrySteps.map((call) => {
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
        calls: resolved,
        status: resolved.every((call) => input.repoIndex.steps.some((entry) => entry.name === call))
          ? "resolved"
          : "generate",
        writes: writesForCalls(resolved, input.stepMap)
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

      const checkpoint = journey.checkpoints.find((entry) => entry.afterApiId === apiId);
      const checkpointAssert = checkpoint
        ? defaultCheckpointAssert(input.repoIndex) || journeyAssertFunctionName(journey.journeyId)
        : undefined;

      steps.push({
        order: order++,
        apiIds: [apiId],
        call,
        status,
        writes: writesForCall(call, input.stepMap),
        checkpoint: checkpointAssert ? [checkpointAssert] : undefined
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
    planner: "deterministic-v1",
    journeys,
    planMeta: {
      totalCalls,
      resolvedCalls,
      generateCalls,
      targetMet: generateCalls === 0 || resolvedCalls / Math.max(totalCalls, 1) >= 0.8
    }
  };
}
