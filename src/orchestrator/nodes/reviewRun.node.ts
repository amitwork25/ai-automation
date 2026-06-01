import type {
  ApprovalManifestArtifact,
  ValidationReportArtifact
} from "../../contracts/pipeline.js";
import { step16Review } from "../../pipelines/validate/step-16-review.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function reviewRunNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const validationReport = await artifactStore.readJson<ValidationReportArtifact>(
    state.runId,
    "15-validation-report.json"
  );
  const approvalManifest = await artifactStore.readJson<ApprovalManifestArtifact>(
    state.runId,
    "18-approval-manifest.json"
  );

  const report = step16Review({
    productId: state.productId,
    runId: state.runId,
    validationReport,
    approvalManifest
  });

  const artifactName = "16-review-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
