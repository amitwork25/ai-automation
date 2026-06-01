import { parse as parseYaml } from "yaml";

import { isOpenApiSpec } from "../../adapters/openapi-contract.parser.js";

export function parseUploadedYaml(text: string, label = "apiContract"): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${label} file is empty`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(trimmed);
  } catch (error) {
    throw new Error(
      `${label} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a YAML object (OpenAPI document)`);
  }

  const record = parsed as Record<string, unknown>;
  if (!isOpenApiSpec(record)) {
    throw new Error(`${label} must be an OpenAPI document (openapi/swagger + paths)`);
  }

  return record;
}

export function parseUploadedJson(text: string, label = "manualTestCases"): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${label} file is empty`);
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
