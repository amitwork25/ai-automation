import type { ApiContract } from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import { depthToRepoRoot } from "../knowledge/load-product-knowledge.js";
import {
  apiMethodBaseName,
  apiServiceClassName,
  modelInterfaceName,
  modelRelativePath,
  requestSchemaRelativePath,
  responseSchemaRelativePath,
  serviceRelativePath,
  serviceSpecRelativePath
} from "./api-naming.js";
import { jsonSchemaDocument, jsonSchemaToInterface } from "./schema-to-typescript.js";

function coreImportPrefix(apiId: string, productId: string): string {
  const depth = serviceRelativePath(apiId, productId).split("/").length - 1;
  return "../".repeat(depth);
}

function modelImportPrefix(apiId: string, productId: string): string {
  const serviceDepth = serviceRelativePath(apiId, productId).split("/").length;
  const modelDepth = modelRelativePath(apiId, productId).split("/").length;
  const up = "../".repeat(serviceDepth - 1);
  return `${up}${modelRelativePath(apiId, productId).replace(/^src\//, "").replace(/\.ts$/, "")}`;
}

export function renderModelFile(api: ApiContract, schemas: Record<string, unknown>): string {
  const responseName = modelInterfaceName(api, "response");
  const responseSchema = api.responseSchemaRef ? (schemas[api.responseSchemaRef] as Record<string, unknown>) : undefined;
  const chunks = [
    `/** Generated from ${api.apiId} (${api.method} ${api.path}). */`,
    jsonSchemaToInterface(responseName, responseSchema)
  ];

  if (api.requestSchemaRef) {
    const requestName = modelInterfaceName(api, "request");
    const requestSchema = schemas[api.requestSchemaRef] as Record<string, unknown> | undefined;
    chunks.push(jsonSchemaToInterface(requestName, requestSchema));
  }

  return `${chunks.join("\n\n")}\n`;
}

export function renderResponseSchemaFile(api: ApiContract, schemas: Record<string, unknown>): string {
  const responseSchema = api.responseSchemaRef ? (schemas[api.responseSchemaRef] as Record<string, unknown>) : undefined;
  return `${JSON.stringify(
    jsonSchemaDocument(`${api.method} ${api.path} success body`, responseSchema),
    null,
    2
  )}\n`;
}

export function renderRequestSchemaFile(api: ApiContract, schemas: Record<string, unknown>): string {
  const requestSchema = api.requestSchemaRef ? (schemas[api.requestSchemaRef] as Record<string, unknown>) : undefined;
  return `${JSON.stringify(
    jsonSchemaDocument(`${api.method} ${api.path} request body`, requestSchema),
    null,
    2
  )}\n`;
}

export function renderServiceFile(api: ApiContract, productId: string, stepMap?: ProductStepMapConfig): string {
  const className = apiServiceClassName(api.apiId, stepMap);
  const methodBase = apiMethodBaseName(api.apiId, stepMap);
  const responseType = modelInterfaceName(api, "response");
  const requestType = modelInterfaceName(api, "request");
  const coreImport = coreImportPrefix(api.apiId, productId);
  const modelImport = modelImportPrefix(api.apiId, productId);
  const responseSchemaPath = responseSchemaRelativePath(api.apiId, productId);
  const hasBody = ["POST", "PUT", "PATCH"].includes(api.method.toUpperCase()) && Boolean(api.requestSchemaRef);
  const requestImport = hasBody
    ? `import type { ${requestType}, ${responseType} } from "${modelImport}";`
    : `import type { ${responseType} } from "${modelImport}";`;
  const rawArgs = hasBody
    ? `payload: ${requestType}, headers: Record<string, string>`
    : "headers: Record<string, string>";
  const callBody = hasBody ? "body: payload," : "";
  const rawCallArgs = hasBody ? "payload, headers" : "headers";

  return `import type { ApiClient } from "${coreImport}core/api/ApiClient";
import type { ApiCallResult } from "${coreImport}core/types/HttpTypes";
import { PerformanceValidator } from "${coreImport}core/validation/PerformanceValidator";
import { ResponseValidator } from "${coreImport}core/validation/ResponseValidator";
import { SchemaValidator } from "${coreImport}core/validation/SchemaValidator";
${requestImport}

const SCHEMA = "${responseSchemaPath}";

/** Generated service for ${api.apiId}. */
export class ${className} {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return ${JSON.stringify(api.path)};
  }

  async ${methodBase}Raw(${rawArgs}): Promise<ApiCallResult<${responseType}>> {
    return this.api.call<${responseType}>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: ${JSON.stringify(api.method.toUpperCase())},
      headers,
      ${callBody}
    });
  }

  async ${methodBase}(${rawArgs}): Promise<${responseType}> {
    const result = await this.${methodBase}Raw(${rawCallArgs});
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, ${JSON.stringify(`${api.apiId}-response`)});
    await PerformanceValidator.responseTime(result.durationMs, 20_000, ${JSON.stringify(api.apiId)});
    return result.json;
  }
}
`;
}

export function renderServiceSpecFile(
  api: ApiContract,
  productId: string,
  stepMap?: ProductStepMapConfig
): string {
  const className = apiServiceClassName(api.apiId, stepMap);
  const methodBase = apiMethodBaseName(api.apiId, stepMap);
  const specPath = serviceSpecRelativePath(api.apiId, productId);
  const depth = depthToRepoRoot(specPath);
  const serviceImport = `${depth}src/services/${serviceRelativePath(api.apiId, productId).replace(/^src\/services\//, "").replace(/\.ts$/, "")}`;
  const isEqx = api.apiId.startsWith("eqx.");
  const hasBody = ["POST", "PUT", "PATCH"].includes(api.method.toUpperCase()) && Boolean(api.requestSchemaRef);
  const requestType = modelInterfaceName(api, "request");
  const modelImport = `${depth}${modelRelativePath(api.apiId, productId).replace(/\.ts$/, "")}`;

  const headersImportPath = stepMap?.authHeadersImport
    ? `${depth}${stepMap.authHeadersImport.replace(/\.ts$/, "")}`
    : undefined;
  const headersBuilder = stepMap?.authHeadersBuilder;

  const headersLine =
    isEqx && headersImportPath && headersBuilder
      ? `import { ${headersBuilder} } from "${headersImportPath}";`
      : isEqx
        ? `import { buildEqxHeaders, getAuthInput } from "${depth}tests/service/eqx/helpers";`
        : headersImportPath && headersBuilder
          ? `import { ${headersBuilder} } from "${headersImportPath}";`
          : "";

  const authSetup =
    isEqx && !headersBuilder
      ? `const input = getAuthInput();
  const headers = buildEqxHeaders(input);`
      : headersBuilder
        ? `const headers = ${headersBuilder}(process.env.TEST_AUTH_TOKEN ?? "");`
        : `const headers = { Authorization: \`Bearer \${process.env.TEST_AUTH_TOKEN ?? ""}\` };`;

  const callLine = hasBody
    ? `await svc.${methodBase}({} as ${requestType}, headers);`
    : `await svc.${methodBase}(headers);`;

  return `import { expect } from "@playwright/test";
import { test } from "${depth}src/fixtures/infrastructure.fixture";
import { ${className} } from "${serviceImport}";
${hasBody ? `import type { ${requestType} } from "${modelImport}";\n` : ""}${headersLine ? `${headersLine}\n` : ""}

/** Generated smoke spec for ${api.apiId}. Extend with negative cases as needed. */
test("@smoke Verify ${api.apiId} service method succeeds with auth headers", async ({ apiClient }) => {
  ${authSetup}
  const svc = new ${className}(apiClient);
  const body = ${callLine.replace("await ", "")};
  expect(body).toBeTruthy();
});
`;
}
