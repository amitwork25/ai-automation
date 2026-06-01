import type { DependencyGraphArtifact, RepoIndexArtifact } from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import { resolveJourneyEntrySteps } from "../knowledge/load-product-knowledge.js";

function snakeToCamel(value: string): string {
  return value
    .split("_")
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function guessStepFromApiId(apiId: string): string | undefined {
  const resource = apiId.split(".").slice(1).join("_");
  if (!resource) {
    return undefined;
  }
  return `${snakeToCamel(resource)}Step`;
}

export function expandApiSequenceWithDependencies(
  apiIds: string[],
  dependencyGraph: DependencyGraphArtifact
): string[] {
  const ordered = [...apiIds];
  for (const apiId of apiIds) {
    for (const edge of dependencyGraph.edges) {
      if (edge.to !== apiId || ordered.includes(edge.from)) {
        continue;
      }
      const targetIndex = ordered.indexOf(apiId);
      ordered.splice(targetIndex, 0, edge.from);
    }
  }
  return [...new Set(ordered)];
}

export function resolveStepCall(
  apiId: string,
  repoIndex: RepoIndexArtifact,
  stepMap: ProductStepMapConfig
): { call: string; status: "resolved" | "generate" } {
  const availableSteps = new Set(repoIndex.steps.map((entry) => entry.name));
  const mapped = stepMap.apiToStep[apiId];
  if (mapped) {
    return { call: mapped, status: availableSteps.has(mapped) ? "resolved" : "generate" };
  }

  const guessed = guessStepFromApiId(apiId);
  if (guessed && availableSteps.has(guessed)) {
    return { call: guessed, status: "resolved" };
  }

  return {
    call: guessed || `generate_${apiId.replace(/\./g, "_")}Step`,
    status: "generate"
  };
}

/** App entry auth (OTP) — always prepended; steps come from product knowledge or repo index. */
export function journeyEntryStepBlock(
  repoIndex: RepoIndexArtifact,
  stepMap: ProductStepMapConfig
): string[] {
  return resolveJourneyEntrySteps(stepMap, repoIndex);
}

export function writesForCalls(
  calls: string[],
  stepMap: ProductStepMapConfig
): Record<string, string> | undefined {
  const writes: Record<string, string> = {};
  for (const call of calls) {
    Object.assign(writes, stepMap.stepWrites?.[call] || {});
  }
  return Object.keys(writes).length > 0 ? writes : undefined;
}

export function writesForCall(
  call: string,
  stepMap: ProductStepMapConfig
): Record<string, string> | undefined {
  const writes = stepMap.stepWrites?.[call];
  return writes ? { ...writes } : undefined;
}

export function defaultCheckpointAssert(repoIndex: RepoIndexArtifact): string | undefined {
  return repoIndex.assertions.find(
    (entry) => entry.name.startsWith("assert") && entry.name.includes("Journey")
  )?.name;
}
