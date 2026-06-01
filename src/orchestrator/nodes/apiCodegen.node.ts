import type { ApiContractsArtifact, RepoIndexArtifact, SchemaIndexArtifact } from "../../contracts/pipeline.js";
import { loadProductStepMap } from "../../pipelines/knowledge/load-product-knowledge.js";
import { step9ApiCodegen } from "../../pipelines/codegen/step-9-api-codegen.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function apiCodegenNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
    state.runId,
    "02-api-contracts.json"
  );
  const schemaIndex = await artifactStore.readJson<SchemaIndexArtifact>(
    state.runId,
    "02c-schema-index.json"
  );
  const repoIndex = await artifactStore.readJson<RepoIndexArtifact>(
    state.runId,
    "03-repo-index.json"
  );
  const stepMap = await loadProductStepMap(state.productId);

  const report = await step9ApiCodegen({
    productId: state.productId,
    repoRoot: state.repoRoot,
    codegenRoot: state.codegenRoot,
    apiContracts,
    schemaIndex,
    repoIndex,
    stepMap
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
