import { adaptApiContracts, materializeApiArtifacts } from "../../adapters/api-contract.adapter.js";
export async function ingestApiContractsNode(state, artifactStore) {
    const rawApiInput = state.inputs.apiContracts ?? state.inputs.postmanCollection;
    if (!rawApiInput) {
        throw new Error("apiContracts or postmanCollection is required");
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
export async function loadIngestArtifacts(artifactStore, state) {
    return {
        apiContracts: await artifactStore.readJson(state.runId, "02-api-contracts.json"),
        dependencyGraph: await artifactStore.readJson(state.runId, "02b-dependency-graph.json"),
        schemaIndex: await artifactStore.readJson(state.runId, "02c-schema-index.json")
    };
}
