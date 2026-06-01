import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export function approvedRulesPath(productId, projectRoot = process.cwd()) {
    return path.join(projectRoot, "agent-knowledge", productId, "rules.approved.json");
}
export async function saveApprovedRules(config, projectRoot = process.cwd()) {
    const filePath = approvedRulesPath(config.productId, projectRoot);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
    return filePath;
}
