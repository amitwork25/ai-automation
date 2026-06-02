import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ApiContractsArtifact } from "../../../src/contracts/pipeline.js";
import { FileArtifactStore } from "../../../src/infrastructure/artifact-store/fileArtifactStore.js";
import { ingestApiContractsNode } from "../../../src/orchestrator/nodes/ingestApiContracts.node.js";
import type { RunState } from "../../../src/orchestrator/state.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

function baseState(openApiSpec?: Record<string, unknown>): RunState {
  return {
    runId: "run-001",
    productId: "bbps/ccbp",
    repoRoot: path.resolve("workspace/framework"),
    codegenRoot: path.resolve("runs/run-001/generated"),
    inputs: {
      manualTestCases: [],
      openApiSpec,
      mappingThreshold: 0.95,
      strictMapping: true,
      mode: "greenfield"
    },
    artifacts: {},
    errors: [],
    status: "running"
  };
}

describe("ingestApiContractsNode", () => {
  it("accepts openApiSpec as the API contract source", async () => {
    const testDir = await mkdtemp(path.join(os.tmpdir(), "ingest-api-contracts-"));
    tempDirs.push(testDir);
    const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));
    const openApiSpec = {
      openapi: "3.0.0",
      info: { title: "Smoke API", version: "1.0.0" },
      paths: {
        "/bills": {
          get: {
            operationId: "ccbp.list_bills",
            responses: {
              "200": {
                description: "ok"
              }
            }
          }
        }
      }
    };

    const result = await ingestApiContractsNode(baseState(openApiSpec), artifactStore);
    const apiContracts = await artifactStore.readJson<ApiContractsArtifact>(
      "run-001",
      "02-api-contracts.json"
    );

    expect(result.artifacts?.["02-api-contracts.json"]).toBeDefined();
    expect(apiContracts.apis).toHaveLength(1);
    expect(apiContracts.apis[0]).toMatchObject({
      apiId: "ccbp.list_bills",
      method: "GET",
      path: "/bills"
    });
  });

  it("reports all supported API input keys when missing", async () => {
    const testDir = await mkdtemp(path.join(os.tmpdir(), "ingest-api-contracts-missing-"));
    tempDirs.push(testDir);
    const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));

    await expect(ingestApiContractsNode(baseState(), artifactStore)).rejects.toThrow(
      "apiContracts, postmanCollection, or openApiSpec is required"
    );
  });
});
