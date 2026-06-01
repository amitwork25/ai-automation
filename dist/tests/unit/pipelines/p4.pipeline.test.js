import path from "node:path";
import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { step3dIncrementalDiff } from "../../../src/pipelines/ingest/step-3d-incremental-diff.js";
import { step17Traceability } from "../../../src/pipelines/validate/step-17-traceability.js";
import { step18ApprovalManifest } from "../../../src/pipelines/validate/step-18-approval-manifest.js";
import { step15Validation } from "../../../src/pipelines/validate/step-15-validation.js";
const p2FixturesDir = path.resolve("runs/p2-verify-1780144975400");
const p3FixturesDir = path.resolve("runs/p3-verify-1780145671232");
async function readFixture(dir, name) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(path.join(dir, name), "utf8"));
}
describe("P4+ incremental, validate, traceability", () => {
    it("builds 03d incremental diff with new vs existing APIs", async () => {
        const diff = step3dIncrementalDiff({
            productId: "bbps/ccbp",
            apiContracts: await readFixture(p2FixturesDir, "02-api-contracts.json"),
            repoIndex: await readFixture(p2FixturesDir, "03-repo-index.json")
        });
        expect(diff.schemaVersion).toBe("03d-incremental-diff-v1");
        expect(diff.existingApis.length).toBeGreaterThan(0);
        expect(diff.newApis.length).toBeGreaterThan(0);
        expect(diff.skipGenerate).toEqual(diff.existingApis);
    });
    it("generates traceability rows and markdown", async () => {
        const { artifact, markdown } = step17Traceability({
            runId: "run-test",
            productId: "bbps/ccbp",
            manualCases: await readFixture(p3FixturesDir, "01b-manual-test-cases.json"),
            businessRules: await readFixture(p3FixturesDir, "05-business-rules.json"),
            mappedRules: await readFixture(p3FixturesDir, "06-business-rules-mapped.json"),
            journeySpec: await readFixture(p3FixturesDir, "04-journey-spec.json"),
            journeyPlan: {
                schemaVersion: "07-journey-plan-v1",
                productId: "bbps/ccbp",
                planner: "deterministic-v1",
                journeys: [],
                planMeta: { totalCalls: 0, resolvedCalls: 0, generateCalls: 0, targetMet: true }
            }
        });
        expect(artifact.rows.length).toBeGreaterThan(0);
        expect(markdown).toContain("| Manual TC | Rule ID | Assert fn | Spec step | API |");
    });
    it("creates approval manifest when journey has unmapped steps", async () => {
        const manifest = step18ApprovalManifest({
            runId: "run-test",
            productId: "bbps/ccbp",
            businessRules: await readFixture(p3FixturesDir, "05-business-rules.json"),
            assertionReport: {
                schemaVersion: "11-assertion-compile-report-v1",
                productId: "bbps/ccbp",
                repoRoot: "/tmp",
                generated: [],
                skipped: [],
                pendingCustom: [],
                errors: [],
                summary: { templateCount: 0, compiledLines: 0, generatedCount: 0, skippedCount: 0 }
            },
            journeySpec: await readFixture(p3FixturesDir, "04-journey-spec.json")
        });
        expect(manifest.approvalStatus).toBe("pending");
        expect(manifest.unmappedManualSteps.length).toBeGreaterThan(0);
    });
    it("validates required artifacts for a completed run fixture set", async () => {
        const codegenRoot = path.join(p3FixturesDir, "generated");
        await mkdir(codegenRoot, { recursive: true });
        const [serviceTestReport, assertionReport, journeyReport] = await Promise.all([
            readFixture(p3FixturesDir, "10-service-test-report.json"),
            readFixture(p3FixturesDir, "11-assertion-compile-report.json"),
            readFixture(p3FixturesDir, "13-journey-codegen-report.json")
        ]);
        for (const report of [serviceTestReport, assertionReport, journeyReport]) {
            for (const entry of report.generated) {
                for (const file of entry.files) {
                    const target = path.join(codegenRoot, file);
                    await mkdir(path.dirname(target), { recursive: true });
                    await writeFile(target, "// fixture\n", "utf8");
                }
            }
        }
        const artifactPaths = Object.fromEntries([
            "01b-manual-test-cases.json",
            "02-api-contracts.json",
            "04-journey-spec.json",
            "03-repo-index.json",
            "05-business-rules.json",
            "06-business-rules-mapped.json",
            "07-journey-plan.json",
            "09-api-codegen-report.json",
            "10-service-test-report.json",
            "11-assertion-compile-report.json",
            "13-journey-codegen-report.json",
            "14-playwright-project-report.json"
        ].map((name) => [name, path.join(p3FixturesDir, name)]));
        const report = await step15Validation({
            productId: "bbps/ccbp",
            repoRoot: path.resolve("workspace/framework"),
            codegenRoot,
            runId: "p4-test",
            artifactPaths,
            apiCodegenReport: await readFixture(p3FixturesDir, "09-api-codegen-report.json"),
            serviceTestReport: await readFixture(p3FixturesDir, "10-service-test-report.json"),
            assertionReport: await readFixture(p3FixturesDir, "11-assertion-compile-report.json"),
            journeyReport,
            runExternalChecks: false
        });
        expect(["pass", "warn"]).toContain(report.validationStatus);
        expect(report.checks.every((check) => check.id.startsWith("artifact:") ? check.status === "pass" : true)).toBe(true);
    });
});
