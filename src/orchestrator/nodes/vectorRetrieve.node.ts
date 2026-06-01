import type {
  ManualTestCasesArtifact,
  VectorIndexReportArtifact
} from "../../contracts/pipeline.js";
import { step3bVectorRetrieve } from "../../pipelines/vector/step-3b-vector-retrieve.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function vectorRetrieveNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const [manualCases, indexReport] = await Promise.all([
    artifactStore.readJson<ManualTestCasesArtifact>(state.runId, "01b-manual-test-cases.json"),
    artifactStore.readJson<VectorIndexReportArtifact>(state.runId, "03a-index-report.json")
  ]);

  const retrieval = step3bVectorRetrieve({
    productId: state.productId,
    manualCases,
    indexReport
  });

  const artifactName = "03b-retrieval-context.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, retrieval);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
