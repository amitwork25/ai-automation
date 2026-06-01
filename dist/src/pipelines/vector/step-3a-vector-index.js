import { readFile } from "node:fs/promises";
import path from "node:path";
import { MemoryVectorStore } from "./memory-vector-store.js";
async function readSnippet(repoRoot, relativePath, maxChars = 1200) {
    try {
        const content = await readFile(path.join(repoRoot, relativePath), "utf8");
        return content.slice(0, maxChars);
    }
    catch {
        return "";
    }
}
export async function step3aVectorIndex(input) {
    const documents = [];
    for (const testCase of input.manualCases.cases) {
        documents.push({
            id: `manual_tc:${testCase.caseId}`,
            collection: "manual_tc",
            text: [testCase.title, ...testCase.steps, ...testCase.expectedResults].join("\n"),
            metadata: { caseId: testCase.caseId }
        });
    }
    for (const api of input.apiContracts.apis) {
        documents.push({
            id: `api:${api.apiId}`,
            collection: "api_contracts",
            text: [api.apiId, api.title ?? "", api.method, api.path, api.operationId ?? ""].join("\n"),
            metadata: { apiId: api.apiId }
        });
    }
    for (const step of input.repoIndex.steps) {
        const snippet = await readSnippet(input.repoRoot, step.filePath);
        if (!snippet) {
            continue;
        }
        documents.push({
            id: `step:${step.name}`,
            collection: "code_steps",
            text: `${step.name}\n${snippet}`,
            metadata: { name: step.name, filePath: step.filePath }
        });
    }
    for (const assertion of input.repoIndex.assertions) {
        const snippet = await readSnippet(input.repoRoot, assertion.filePath);
        if (!snippet) {
            continue;
        }
        documents.push({
            id: `assert:${assertion.name}`,
            collection: "code_asserts",
            text: `${assertion.name}\n${snippet}`,
            metadata: { name: assertion.name, filePath: assertion.filePath }
        });
    }
    const store = new MemoryVectorStore();
    store.index(documents);
    const collectionCounts = documents.reduce((counts, document) => {
        counts[document.collection] = (counts[document.collection] ?? 0) + 1;
        return counts;
    }, {});
    return {
        report: {
            schemaVersion: "03a-index-report-v1",
            productId: input.productId,
            repoRoot: input.repoRoot,
            manualTcHash: input.manualCases.manualTcHash,
            collectionCounts,
            documents,
            summary: {
                totalDocuments: documents.length,
                indexedAt: new Date().toISOString()
            }
        },
        store
    };
}
