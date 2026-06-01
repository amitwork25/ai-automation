import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

import { loadFrameworkConfig } from "../src/config/framework.config.js";
import { FileArtifactStore } from "../src/infrastructure/artifact-store/fileArtifactStore.js";
import { executeRunGraph } from "../src/orchestrator/graph.js";
import { resolveCodegenRoot, defaultRunsDir } from "../src/pipelines/codegen/codegen-output-root.js";
import type { CreateRunRequest } from "../src/services/runs/run.service.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const payloadPath = process.argv[2] ?? path.join(rootDir, "inputs/bbps-ccbp/run-payload.json");
  const payload = JSON.parse(readFileSync(payloadPath, "utf8")) as CreateRunRequest;

  const frameworkConfig = loadFrameworkConfig();
  const runId = randomUUID();
  const runsDir = defaultRunsDir(rootDir);
  const codegenRoot = resolveCodegenRoot(runsDir, runId);
  const artifactStore = new FileArtifactStore(runsDir);

  const result = await executeRunGraph(
    { artifactStore, runsDir },
    {
      runId,
      productId: payload.productId?.trim() || "unknown-product",
      repoRoot: frameworkConfig.workspaceDir,
      codegenRoot,
      inputs: {
        manualTestCases: payload.manualTestCases,
        apiContracts: payload.apiContracts,
        postmanCollection: payload.postmanCollection,
        openApiSpec: payload.openApiSpec,
        apiAliases: payload.apiAliases,
        mappingThreshold: payload.mappingThreshold ?? 0.95,
        strictMapping: payload.strictMapping ?? true,
        mode: payload.mode ?? "greenfield",
        useVectorRetrieval: payload.useVectorRetrieval ?? false,
        llmProfile: payload.llmProfile ?? "standard"
      },
      artifacts: {},
      errors: [],
      status: "running"
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
