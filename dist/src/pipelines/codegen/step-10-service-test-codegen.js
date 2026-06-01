import { access } from "node:fs/promises";
import path from "node:path";
import { apiServiceClassName, serviceRelativePath, serviceSpecRelativePath } from "./api-naming.js";
import { writeTextFile } from "./file-writer.js";
import { renderServiceSpecFile } from "./render-api-files.js";
async function serviceFileExists(root, relativePath) {
    try {
        await access(path.join(root, relativePath));
        return true;
    }
    catch {
        return false;
    }
}
export async function step10ServiceTestCodegen(input) {
    const generated = [];
    const skipped = [];
    const errors = [];
    const generatedApiIds = new Set(input.apiCodegenReport.generated.map((entry) => entry.apiId));
    const targetApis = input.apiContracts.apis;
    for (const api of targetApis) {
        try {
            const className = apiServiceClassName(api.apiId, input.stepMap);
            const servicePath = serviceRelativePath(api.apiId, input.productId);
            const hasService = input.repoIndex.services.some((entry) => entry.className === className) ||
                generatedApiIds.has(api.apiId) ||
                (await serviceFileExists(input.codegenRoot, servicePath));
            if (!hasService) {
                skipped.push({
                    apiId: api.apiId,
                    reason: "no service available to test (missing from framework index and step 9 output)",
                    existingPath: undefined
                });
                continue;
            }
            const specPath = serviceSpecRelativePath(api.apiId, input.productId);
            const write = await writeTextFile({
                outputRoot: input.codegenRoot,
                relativePath: specPath,
                content: renderServiceSpecFile(api, input.productId, input.stepMap),
                overwrite: true
            });
            generated.push({ apiId: api.apiId, files: [write.relativePath] });
        }
        catch (error) {
            errors.push({
                apiId: api.apiId,
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }
    return {
        schemaVersion: "10-service-test-report-v1",
        productId: input.productId,
        repoRoot: input.codegenRoot,
        generated,
        skipped,
        errors,
        summary: {
            totalApis: targetApis.length,
            generatedCount: generated.length,
            skippedCount: skipped.length,
            errorCount: errors.length
        }
    };
}
