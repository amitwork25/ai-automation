import type { ApiContractsArtifact, RepoIndexArtifact } from "../../contracts/pipeline.js";
import { step3dIncrementalDiff } from "../../pipelines/ingest/step-3d-incremental-diff.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function incrementalDiffNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  if (state.inputs.mode !== "incremental") {
    return { artifacts: state.artifacts };
  }

  const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
    state.runId,
    "02-api-contracts.json"
  );
  const repoIndex = await artifactStore.readJson<RepoIndexArtifact>(
    state.runId,
    "03-repo-index.json"
  );

  const diff = step3dIncrementalDiff({
    productId: state.productId,
    apiContracts,
    repoIndex
  });

  const artifactName = "03d-incremental-diff.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, diff);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
