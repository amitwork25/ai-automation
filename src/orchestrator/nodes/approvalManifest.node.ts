import type {
  AssertionCompileReportArtifact,
  BusinessRulesArtifact,
  CustomAssertCompileReportArtifact,
  JourneySpecArtifact
} from "../../contracts/pipeline.js";
import { step18ApprovalManifest } from "../../pipelines/validate/step-18-approval-manifest.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function approvalManifestNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const businessRules = await artifactStore.readJson<BusinessRulesArtifact>(
    state.runId,
    "05-business-rules.json"
  );
  const assertionReport = await artifactStore.readJson<AssertionCompileReportArtifact>(
    state.runId,
    "11-assertion-compile-report.json"
  );
  const journeySpec = await artifactStore.readJson<JourneySpecArtifact>(
    state.runId,
    "04-journey-spec.json"
  );

  let customAssertReport: CustomAssertCompileReportArtifact | undefined;
  if (state.artifacts["12-custom-assert-report.json"]) {
    customAssertReport = await artifactStore.readJson<CustomAssertCompileReportArtifact>(
      state.runId,
      "12-custom-assert-report.json"
    );
  }

  const manifest = step18ApprovalManifest({
    runId: state.runId,
    productId: state.productId,
    businessRules,
    assertionReport,
    customAssertReport,
    journeySpec
  });

  const artifactName = "18-approval-manifest.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, manifest);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
