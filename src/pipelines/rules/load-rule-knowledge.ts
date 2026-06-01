import { access } from "node:fs/promises";
import path from "node:path";

import type { AssertionCatalog, ApprovedRulesConfig, ApiAliasesConfig } from "../../contracts/pipeline.js";

export async function loadAssertionCatalog(projectRoot = process.cwd()): Promise<AssertionCatalog> {
  const catalogPath = path.join(projectRoot, "assertion-catalog.json");
  const raw = await readJsonFile<AssertionCatalog>(catalogPath);
  return raw;
}

export async function loadApprovedRules(
  productId: string,
  projectRoot = process.cwd()
): Promise<ApprovedRulesConfig | undefined> {
  const approvedPath = path.join(projectRoot, "agent-knowledge", productId, "rules.approved.json");
  try {
    await access(approvedPath);
  } catch {
    return undefined;
  }
  return readJsonFile<ApprovedRulesConfig>(approvedPath);
}

export async function loadApiAliases(
  productId: string,
  projectRoot = process.cwd()
): Promise<ApiAliasesConfig | undefined> {
  const aliasesPath = path.join(projectRoot, "agent-knowledge", productId, "api-aliases.json");
  try {
    await access(aliasesPath);
  } catch {
    return undefined;
  }
  return readJsonFile<ApiAliasesConfig>(aliasesPath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}
