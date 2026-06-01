import { access } from "node:fs/promises";
import path from "node:path";

import type {
  ApiCodegenReportArtifact,
  ApiContract,
  ApiContractsArtifact,
  RepoIndexArtifact,
  SchemaIndexArtifact
} from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import {
  apiServiceClassName,
  modelRelativePath,
  requestSchemaRelativePath,
  responseSchemaRelativePath,
  serviceRelativePath
} from "./api-naming.js";
import { writeTextFile } from "./file-writer.js";
import {
  renderModelFile,
  renderRequestSchemaFile,
  renderResponseSchemaFile,
  renderServiceFile
} from "./render-api-files.js";

async function pathExists(repoRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function resolveSkipReason(
  api: ApiContract,
  productId: string,
  repoIndex: RepoIndexArtifact,
  stepMap?: ProductStepMapConfig
): { skip: boolean; reason?: string; existingPath?: string } {
  const className = apiServiceClassName(api.apiId, stepMap);
  const existingService = repoIndex.services.find((entry) => entry.className === className);
  if (existingService) {
    return { skip: true, reason: "service exists in repo index", existingPath: existingService.filePath };
  }

  const servicePath = serviceRelativePath(api.apiId, productId);
  if (repoIndex.services.some((entry) => entry.filePath === servicePath)) {
    return { skip: true, reason: "service file indexed", existingPath: servicePath };
  }

  return { skip: false };
}

export async function step9ApiCodegen(input: {
  productId: string;
  repoRoot: string;
  /** When set, services/models/schemas are written here instead of repoRoot. */
  codegenRoot?: string;
  apiContracts: ApiContractsArtifact;
  schemaIndex: SchemaIndexArtifact;
  repoIndex: RepoIndexArtifact;
  stepMap?: ProductStepMapConfig;
  /** Optional subset; default = all APIs in the contract. */
  apiFilter?: string[];
}): Promise<ApiCodegenReportArtifact> {
  const generated: ApiCodegenReportArtifact["generated"] = [];
  const skipped: ApiCodegenReportArtifact["skipped"] = [];
  const errors: ApiCodegenReportArtifact["errors"] = [];

  const outputRoot = input.codegenRoot ?? input.repoRoot;
  const runScoped = Boolean(input.codegenRoot);

  const apis = input.apiFilter
    ? input.apiContracts.apis.filter((api) => input.apiFilter?.includes(api.apiId))
    : input.apiContracts.apis;

  for (const api of apis) {
    try {
      const servicePath = serviceRelativePath(api.apiId, input.productId);
      if (runScoped) {
        if (await pathExists(outputRoot, servicePath)) {
          skipped.push({
            apiId: api.apiId,
            reason: "service file already exists in run codegen output",
            existingPath: servicePath
          });
          continue;
        }
      } else {
        const skipDecision = resolveSkipReason(api, input.productId, input.repoIndex, input.stepMap);
        if (!skipDecision.skip && (await pathExists(input.repoRoot, servicePath))) {
          skipped.push({
            apiId: api.apiId,
            reason: "service file already exists on disk",
            existingPath: servicePath
          });
          continue;
        }
        if (skipDecision.skip) {
          skipped.push({
            apiId: api.apiId,
            reason: skipDecision.reason || "existing service",
            existingPath: skipDecision.existingPath
          });
          continue;
        }
      }

      const files: string[] = [];
      const schemas = input.schemaIndex.schemas;

      const modelWrite = await writeTextFile({
        outputRoot,
        relativePath: modelRelativePath(api.apiId, input.productId),
        content: renderModelFile(api, schemas),
        overwrite: runScoped
      });
      files.push(modelWrite.relativePath);

      const responseSchemaWrite = await writeTextFile({
        outputRoot,
        relativePath: responseSchemaRelativePath(api.apiId, input.productId),
        content: renderResponseSchemaFile(api, schemas),
        overwrite: runScoped
      });
      files.push(responseSchemaWrite.relativePath);

      if (api.requestSchemaRef) {
        const requestSchemaWrite = await writeTextFile({
          outputRoot,
          relativePath: requestSchemaRelativePath(api.apiId, input.productId),
          content: renderRequestSchemaFile(api, schemas),
          overwrite: runScoped
        });
        files.push(requestSchemaWrite.relativePath);
      }

      const serviceWrite = await writeTextFile({
        outputRoot,
        relativePath: servicePath,
        content: renderServiceFile(api, input.productId, input.stepMap),
        overwrite: runScoped
      });
      files.push(serviceWrite.relativePath);

      generated.push({ apiId: api.apiId, files });
    } catch (error) {
      errors.push({
        apiId: api.apiId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    schemaVersion: "09-api-codegen-report-v1",
    productId: input.productId,
    repoRoot: outputRoot,
    generated,
    skipped,
    errors,
    summary: {
      totalApis: apis.length,
      generatedCount: generated.length,
      skippedCount: skipped.length,
      errorCount: errors.length
    }
  };
}
