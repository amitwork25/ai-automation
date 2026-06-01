import type { ApiContractsArtifact, DependencyGraphArtifact, SchemaIndexArtifact } from "../../contracts/pipeline.js";
import { adaptApiContracts, materializeApiArtifacts } from "../../adapters/api-contract.adapter.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function ingestApiContractsNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const rawApiInput =
    state.inputs.apiContracts ?? state.inputs.postmanCollection ?? state.inputs.openApiSpec;
  if (!rawApiInput) {
    throw new Error("apiContracts, postmanCollection, or openApiSpec is required");
  }

  const adapted = adaptApiContracts(rawApiInput, state.productId, state.inputs.openApiSpec);
  const outputs = materializeApiArtifacts(adapted, state.productId);

  const apiContractsName = "02-api-contracts.json";
  const dependencyName = "02b-dependency-graph.json";
  const schemaIndexName = "02c-schema-index.json";

  const apiContractsPath = await artifactStore.writeJson(state.runId, apiContractsName, outputs.apiContracts);
  const dependencyPath = await artifactStore.writeJson(state.runId, dependencyName, outputs.dependencyGraph);
  const schemaIndexPath = await artifactStore.writeJson(state.runId, schemaIndexName, outputs.schemaIndex);

  return {
    artifacts: {
      ...state.artifacts,
      [apiContractsName]: apiContractsPath,
      [dependencyName]: dependencyPath,
      [schemaIndexName]: schemaIndexPath
    }
  };
}

export async function loadIngestArtifacts(artifactStore: IArtifactStore, state: RunState): Promise<{
  apiContracts: ApiContractsArtifact;
  dependencyGraph: DependencyGraphArtifact;
  schemaIndex: SchemaIndexArtifact;
}> {
  return {
    apiContracts: await artifactStore.readJson<ApiContractsArtifact>(state.runId, "02-api-contracts.json"),
    dependencyGraph: await artifactStore.readJson<DependencyGraphArtifact>(
      state.runId,
      "02b-dependency-graph.json"
    ),
    schemaIndex: await artifactStore.readJson<SchemaIndexArtifact>(state.runId, "02c-schema-index.json")
  };
}
