import type { ApiContractsArtifact } from "../../contracts/pipeline.js";
import { step9ApiCodegenStub } from "../../pipelines/codegen/step-9-api-codegen-stub.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

/** Step 9 skipped — writes report-only stub, no framework files. */
export async function apiCodegenSkippedNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
    state.runId,
    "02-api-contracts.json"
  );

  const report = step9ApiCodegenStub({
    productId: state.productId,
    codegenRoot: state.codegenRoot,
    apiContracts,
    reason: "step 9 excluded — API services not generated into framework"
  });

  const artifactName = "09-api-codegen-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
