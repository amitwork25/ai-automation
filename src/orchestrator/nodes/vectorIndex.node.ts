import type {
  ApiContractsArtifact,
  ManualTestCasesArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import { step3aVectorIndex } from "../../pipelines/vector/step-3a-vector-index.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function vectorIndexNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const [manualCases, apiContracts, repoIndex] = await Promise.all([
    artifactStore.readJson<ManualTestCasesArtifact>(state.runId, "01b-manual-test-cases.json"),
    artifactStore.readJson<ApiContractsArtifact>(state.runId, "02-api-contracts.json"),
    artifactStore.readJson<RepoIndexArtifact>(state.runId, "03-repo-index.json")
  ]);

  const { report } = await step3aVectorIndex({
    productId: state.productId,
    repoRoot: state.repoRoot,
    manualCases,
    apiContracts,
    repoIndex
  });

  const artifactName = "03a-index-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
