import path from "node:path";

import type { ApiContract } from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";

function snakeToPascal(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function snakeToCamel(value: string): string {
  const pascal = snakeToPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function snakeToKebab(value: string): string {
  return value.replace(/_/g, "-").toLowerCase();
}

export function apiDomain(apiId: string): string {
  return apiId.split(".")[0] || "api";
}

export function apiResource(apiId: string): string {
  return apiId.split(".").slice(1).join("_") || "resource";
}

export function apiClassPrefix(apiId: string): string {
  return snakeToPascal(apiDomain(apiId));
}

export function apiServiceClassName(apiId: string, stepMap?: ProductStepMapConfig): string {
  const alias = stepMap?.serviceClassAliases?.[apiId];
  if (alias) {
    return alias;
  }
  return `${apiClassPrefix(apiId)}${snakeToPascal(apiResource(apiId))}Service`;
}

export function apiMethodBaseName(apiId: string, stepMap?: ProductStepMapConfig): string {
  const alias = stepMap?.serviceMethodAliases?.[apiId];
  if (alias) {
    return alias;
  }
  return snakeToCamel(apiResource(apiId));
}

export function apiKebabSlug(apiId: string): string {
  return snakeToKebab(apiResource(apiId));
}

export function modelBaseName(api: ApiContract): string {
  if (api.responseSchemaRef) {
    return api.responseSchemaRef.replace(/Response$/, "");
  }
  return `${apiClassPrefix(api.apiId)}${snakeToPascal(apiResource(api.apiId))}`;
}

export function modelInterfaceName(api: ApiContract, kind: "request" | "response"): string {
  const base = modelBaseName(api);
  return kind === "request" ? `${base}Request` : `${base}Response`;
}

export function servicePathSegments(apiId: string, productId: string): string[] {
  const domain = apiDomain(apiId);
  if (domain === "eqx") {
    return ["src", "services", "eqx"];
  }
  return ["src", "services", "eqx", ...productId.split("/")];
}

export function modelPathSegments(apiId: string, productId: string): string[] {
  const domain = apiDomain(apiId);
  if (domain === "eqx") {
    return ["src", "models", "eqx"];
  }
  return ["src", "models", "eqx", ...productId.split("/")];
}

export function schemaPathSegments(apiId: string, productId: string): string[] {
  const domain = apiDomain(apiId);
  if (domain === "eqx") {
    return ["src", "schemas", "eqx"];
  }
  return ["src", "schemas", "eqx", ...productId.split("/")];
}

export function serviceTestPathSegments(apiId: string, productId: string): string[] {
  const domain = apiDomain(apiId);
  if (domain === "eqx") {
    return ["tests", "service", "eqx", apiKebabSlug(apiId)];
  }
  return ["tests", "service", ...productId.split("/"), apiKebabSlug(apiId)];
}

export function joinRepoPath(repoRoot: string, segments: string[], fileName: string): string {
  return path.join(repoRoot, ...segments, fileName);
}

export function relativeRepoPath(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

export function serviceRelativePath(apiId: string, productId: string): string {
  const className = apiServiceClassName(apiId);
  const segments = servicePathSegments(apiId, productId);
  return path.join(...segments, `${className}.ts`);
}

export function modelRelativePath(apiId: string, productId: string): string {
  return path.join(...modelPathSegments(apiId, productId), `${apiKebabSlug(apiId)}.models.ts`);
}

export function responseSchemaRelativePath(apiId: string, productId: string): string {
  return path.join(...schemaPathSegments(apiId, productId), `${apiKebabSlug(apiId)}-response.schema.json`);
}

export function requestSchemaRelativePath(apiId: string, productId: string): string {
  return path.join(...schemaPathSegments(apiId, productId), `${apiKebabSlug(apiId)}-request.schema.json`);
}

export function serviceSpecRelativePath(apiId: string, productId: string): string {
  return path.join(...serviceTestPathSegments(apiId, productId), `${apiKebabSlug(apiId)}.service.spec.ts`);
}
