import path from "node:path";
import { personaFolder } from "../codegen/render-integration-files.js";
import { writeTextFile } from "../codegen/file-writer.js";
function customAssertFunctionName(ruleId) {
    return `assertCustom_${ruleId.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}
export async function step12CustomAsserts(input) {
    const pendingRuleIds = new Set([
        ...input.assertionReport.pendingCustom,
        ...input.mappedRules.mappings.filter((entry) => entry.status === "custom").map((entry) => entry.ruleId)
    ]);
    const customRules = input.businessRules.rules.filter((rule) => pendingRuleIds.has(rule.ruleId));
    const generated = [];
    const skipped = [];
    const errors = [];
    const pendingLlm = [];
    if (customRules.length === 0) {
        return {
            schemaVersion: "12-custom-assert-report-v1",
            productId: input.productId,
            repoRoot: input.codegenRoot,
            generated,
            skipped,
            pendingLlm,
            errors,
            summary: {
                customRuleCount: 0,
                stubCount: 0,
                skippedCount: 0
            }
        };
    }
    let fnLines;
    if (input.useLlm && input.llmClient) {
        const generations = await input.llmClient.generateCustomAsserts({
            productId: input.productId,
            rules: customRules,
            retrievalContext: input.retrievalContext?.results.map((entry) => ({
                caseId: entry.caseId,
                manualStepIndex: entry.manualStepIndex,
                queryText: entry.queryText,
                hits: entry.hits.map((hit) => ({ collection: hit.collection, text: hit.text }))
            }))
        });
        const generationByRuleId = new Map(generations.map((entry) => [entry.ruleId, entry]));
        fnLines = customRules.map((rule) => {
            const generation = generationByRuleId.get(rule.ruleId);
            if (!generation) {
                pendingLlm.push(rule.ruleId);
                const fn = customAssertFunctionName(rule.ruleId);
                return `export function ${fn}(ctx: Record<string, unknown>): void {
  // TODO(step-12-llm): ${rule.text.replace(/\n/g, " ").slice(0, 120)}
  void ctx;
}`;
            }
            if (generation.body.includes("TODO(step-12-llm)")) {
                pendingLlm.push(rule.ruleId);
            }
            return generation.body;
        });
    }
    else {
        fnLines = customRules.map((rule) => {
            const fn = customAssertFunctionName(rule.ruleId);
            pendingLlm.push(rule.ruleId);
            return `export function ${fn}(ctx: Record<string, unknown>): void {
  // TODO(step-12-llm): ${rule.text.replace(/\n/g, " ").slice(0, 120)}
  void ctx;
}`;
        });
    }
    const content = `/** Custom assert functions for pending rules (step 12). */
${fnLines.join("\n\n")}
`;
    const outputPath = path.join("tests/integration", ...input.productId.split("/"), personaFolder(input.persona), "custom-asserts.generated.ts");
    try {
        const write = await writeTextFile({
            outputRoot: input.codegenRoot,
            relativePath: outputPath,
            content,
            overwrite: true
        });
        generated.push({
            apiId: input.productId,
            files: [write.relativePath]
        });
    }
    catch (error) {
        errors.push({
            apiId: input.productId,
            message: error instanceof Error ? error.message : String(error)
        });
    }
    return {
        schemaVersion: "12-custom-assert-report-v1",
        productId: input.productId,
        repoRoot: input.codegenRoot,
        generated,
        skipped,
        pendingLlm: [...new Set(pendingLlm)],
        errors,
        summary: {
            customRuleCount: customRules.length,
            stubCount: pendingLlm.length,
            skippedCount: skipped.length
        }
    };
}
