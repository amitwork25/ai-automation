import type {
  ApiCodegenReportArtifact,
  ApiContractsArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step10ServiceTestCodegen } from "../../pipelines/codegen/step-10-service-test-codegen.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function serviceTestCodegenNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
    state.runId,
    "02-api-contracts.json"
  );
  const repoIndex = await artifactStore.readJson<RepoIndexArtifact>(
    state.runId,
    "03-repo-index.json"
  );
  const apiCodegenReport = await artifactStore.readJson<ApiCodegenReportArtifact>(
    state.runId,
    "09-api-codegen-report.json"
  );
  const stepMap = await loadProductStepMap(state.productId);

  const report = await step10ServiceTestCodegen({
    productId: state.productId,
    codegenRoot: state.codegenRoot,
    apiContracts,
    repoIndex,
    apiCodegenReport,
    stepMap
  });

  const artifactName = "10-service-test-report.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, report);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    },
    flags: {
      unmappedRuleCount: state.flags?.unmappedRuleCount ?? 0,
      pendingCustomCount: state.flags?.pendingCustomCount ?? 0,
      linkerLlmInvoked: state.flags?.linkerLlmInvoked ?? false,
      serviceTestLlmInvoked: state.flags?.serviceTestLlmInvoked ?? false
    }
  };
}
