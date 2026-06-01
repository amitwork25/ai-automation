import type {
  ApiCodegenReportArtifact,
  AssertionCompileReportArtifact,
  JourneyCodegenReportArtifact,
  ServiceTestCodegenReportArtifact
} from "../../contracts/pipeline.js";
import { step15Validation } from "../../pipelines/validate/step-15-validation.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function validateRunNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const apiCodegenReport = await artifactStore.readJson<ApiCodegenReportArtifact>(
    state.runId,
    "09-api-codegen-report.json"
  );
  const serviceTestReport = await artifactStore.readJson<ServiceTestCodegenReportArtifact>(
    state.runId,
    "10-service-test-report.json"
  );
  const assertionReport = await artifactStore.readJson<AssertionCompileReportArtifact>(
    state.runId,
    "11-assertion-compile-report.json"
  );
  const journeyReport = await artifactStore.readJson<JourneyCodegenReportArtifact>(
    state.runId,
    "13-journey-codegen-report.json"
  );

  const report = await step15Validation({
    productId: state.productId,
    repoRoot: state.repoRoot,
    codegenRoot: state.codegenRoot,
    runId: state.runId,
    artifactPaths: state.artifacts,
    apiCodegenReport,
    serviceTestReport,
    assertionReport,
    journeyReport
  });

  const artifactName = "15-validation-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
