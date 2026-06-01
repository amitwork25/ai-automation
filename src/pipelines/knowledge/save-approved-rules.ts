import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ApprovedRulesConfig } from "../../contracts/pipeline.js";

export function approvedRulesPath(productId: string, projectRoot = process.cwd()): string {
  return path.join(projectRoot, "agent-knowledge", productId, "rules.approved.json");
}

export async function saveApprovedRules(
  config: ApprovedRulesConfig,
  projectRoot = process.cwd()
): Promise<string> {
  const filePath = approvedRulesPath(config.productId, projectRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
  return filePath;
}
