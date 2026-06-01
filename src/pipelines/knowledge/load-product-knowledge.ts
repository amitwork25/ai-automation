import { access } from "node:fs/promises";
import path from "node:path";

import type { RepoIndexArtifact } from "../../contracts/pipeline.js";
import {
  EMPTY_PRODUCT_STEP_MAP,
  type ProductStepMapConfig
} from "./product-step-map.types.js";

export type { ProductStepMapConfig } from "./product-step-map.types.js";

export async function loadProductStepMap(
  productId: string,
  projectRoot = process.cwd()
): Promise<ProductStepMapConfig> {
  const mapPath = path.join(projectRoot, "agent-knowledge", productId, "api-step-map.json");
  try {
    await access(mapPath);
  } catch {
    return { ...EMPTY_PRODUCT_STEP_MAP, productId };
  }
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(mapPath, "utf8")) as ProductStepMapConfig;
  return {
    ...EMPTY_PRODUCT_STEP_MAP,
    ...raw,
    productId: raw.productId || productId
  };
}

/** Resolve app-entry steps: config first, then repo index OTP step names. */
export function resolveJourneyEntrySteps(
  stepMap: ProductStepMapConfig,
  repoIndex: RepoIndexArtifact
): string[] {
  const configured = stepMap.journeyEntrySteps.filter(Boolean);
  if (configured.length > 0) {
    return filterAvailableSteps(configured, repoIndex);
  }

  const fromRepo = repoIndex.steps
    .map((entry) => entry.name)
    .filter((name) => /sendotp/i.test(name) || /verifyotp/i.test(name));

  const ordered = ["sendOtpStep", "verifyOtpStep"].filter(
    (name) => fromRepo.includes(name) || repoIndex.steps.some((entry) => entry.name === name)
  );
  return filterAvailableSteps(ordered.length > 0 ? ordered : fromRepo, repoIndex);
}

function filterAvailableSteps(stepNames: string[], repoIndex: RepoIndexArtifact): string[] {
  const available = new Set(repoIndex.steps.map((entry) => entry.name));
  return stepNames.filter((name) => available.size === 0 || available.has(name));
}

export function findTestDataGetter(repoIndex: RepoIndexArtifact): string | undefined {
  return repoIndex.steps.find((entry) => /^get\w+TestData$/.test(entry.name))?.name;
}

export function relativeImportToSharedSteps(
  fromDirRelativeToRepo: string,
  sharedStepsPath: string
): string {
  const fromDir = path.posix.dirname(fromDirRelativeToRepo.replace(/\\/g, "/"));
  const shared = sharedStepsPath.replace(/\\/g, "/").replace(/\.ts$/, "");
  return path.posix.relative(fromDir, shared) || ".";
}

export function depthToRepoRoot(relativeFilePath: string): string {
  const segments = relativeFilePath.replace(/\\/g, "/").split("/").length - 1;
  return "../".repeat(Math.max(segments, 1));
}
