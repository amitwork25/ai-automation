import path from "node:path";
import { writeTextFile } from "./file-writer.js";
function projectSlug(productId) {
    return productId.replace(/\//g, "-");
}
export async function step14PlaywrightProject(input) {
    const slug = projectSlug(input.productId);
    const configPath = path.join("playwright", `${slug}.generated.config.ts`);
    const content = `/** Playwright project config for run ${input.runId} (step 14). */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: ["**/*.generated.spec.ts"],
  projects: [
    {
      name: "${slug}-${input.runId.slice(0, 8)}",
      testDir: ".",
      grep: /@${slug}|@run-${input.runId.slice(0, 8)}/
    }
  ]
});
`;
    const write = await writeTextFile({
        outputRoot: input.codegenRoot,
        relativePath: configPath,
        content,
        overwrite: true
    });
    return {
        schemaVersion: "14-playwright-project-v1",
        productId: input.productId,
        runId: input.runId,
        codegenRoot: input.codegenRoot,
        generated: [{ apiId: input.productId, files: [write.relativePath] }],
        skipped: [],
        errors: [],
        summary: {
            generatedCount: 1,
            skippedCount: 0,
            errorCount: 0
        }
    };
}
