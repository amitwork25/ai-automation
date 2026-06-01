/** Step 9 skipped — report-only stub (no files written). */
export function step9ApiCodegenStub(input) {
    const reason = input.reason ?? "step 9 skipped by run policy";
    return {
        schemaVersion: "09-api-codegen-report-v1",
        productId: input.productId,
        repoRoot: input.codegenRoot,
        generated: [],
        skipped: input.apiContracts.apis.map((api) => ({
            apiId: api.apiId,
            reason,
            existingPath: undefined
        })),
        errors: [],
        summary: {
            totalApis: input.apiContracts.apis.length,
            generatedCount: 0,
            skippedCount: input.apiContracts.apis.length,
            errorCount: 0
        }
    };
}
