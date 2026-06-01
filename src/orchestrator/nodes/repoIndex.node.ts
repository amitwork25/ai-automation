import { access } from "node:fs/promises";

import { step3RepoIndex } from "../../pipelines/ingest/step-3-repo-index.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function repoIndexNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  try {
    await access(state.repoRoot);
  } catch {
    return {
      errors: [...state.errors, `Framework repoRoot is not accessible: ${state.repoRoot}`],
      status: "failed"
    };
  }

  const repoIndex = await step3RepoIndex({
    productId: state.productId,
    repoRoot: state.repoRoot
  });

  const artifactName = "03-repo-index.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, repoIndex);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
