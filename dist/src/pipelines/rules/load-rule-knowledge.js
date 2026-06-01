import { access } from "node:fs/promises";
import path from "node:path";
export async function loadAssertionCatalog(projectRoot = process.cwd()) {
    const catalogPath = path.join(projectRoot, "assertion-catalog.json");
    const raw = await readJsonFile(catalogPath);
    return raw;
}
export async function loadApprovedRules(productId, projectRoot = process.cwd()) {
    const approvedPath = path.join(projectRoot, "agent-knowledge", productId, "rules.approved.json");
    try {
        await access(approvedPath);
    }
    catch {
        return undefined;
    }
    return readJsonFile(approvedPath);
}
export async function loadApiAliases(productId, projectRoot = process.cwd()) {
    const aliasesPath = path.join(projectRoot, "agent-knowledge", productId, "api-aliases.json");
    try {
        await access(aliasesPath);
    }
    catch {
        return undefined;
    }
    return readJsonFile(aliasesPath);
}
async function readJsonFile(filePath) {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
}
