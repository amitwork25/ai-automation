import type { ApiContractsArtifact, IncrementalDiffArtifact, RepoIndexArtifact } from "../../contracts/pipeline.js";
import { apiServiceClassName, serviceRelativePath } from "../codegen/api-naming.js";

export function step3dIncrementalDiff(input: {
  productId: string;
  apiContracts: ApiContractsArtifact;
  repoIndex: RepoIndexArtifact;
}): IncrementalDiffArtifact {
  const existingApis: string[] = [];
  const newApis: string[] = [];
  const skipGenerate: string[] = [];
  const touchFiles = new Set<string>();

  const serviceClasses = new Set(input.repoIndex.services.map((entry) => entry.className));

  for (const api of input.apiContracts.apis) {
    const className = apiServiceClassName(api.apiId);
    const servicePath = serviceRelativePath(api.apiId, input.productId);
    const exists =
      serviceClasses.has(className) ||
      input.repoIndex.services.some((entry) => entry.filePath === servicePath);

    if (exists) {
      existingApis.push(api.apiId);
      skipGenerate.push(api.apiId);
    } else {
      newApis.push(api.apiId);
    }
  }

  for (const journey of input.repoIndex.journeys) {
    touchFiles.add(journey.filePath);
  }
  for (const spec of input.repoIndex.specs) {
    touchFiles.add(spec.filePath);
  }

  return {
    schemaVersion: "03d-incremental-diff-v1",
    productId: input.productId,
    mode: "incremental",
    newApis,
    existingApis,
    skipGenerate,
    touchFiles: [...touchFiles]
  };
}
