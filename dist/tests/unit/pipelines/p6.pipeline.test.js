import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HeuristicCustomAssertLlmClient } from "../../../src/infrastructure/llm/custom-assert-llm.client.js";
import { persistApprovedKnowledge, step18Approve } from "../../../src/pipelines/approve/step-18-approve.js";
import { step12CustomAsserts } from "../../../src/pipelines/codegen/step-12-custom-asserts.js";
import { FileArtifactStore } from "../../../src/infrastructure/artifact-store/fileArtifactStore.js";
import { RunService } from "../../../src/services/runs/run.service.js";
const p3FixturesDir = path.resolve("runs/p3-verify-1780145671232");
const tempDirs = [];
afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function readFixture(name) {
    return JSON.parse(await readFile(path.join(p3FixturesDir, name), "utf8"));
}
function mockFrameworkService() {
    return {
        async initOnStartup() {
            return Promise.resolve();
        },
        async runRefresh() {
            return {
                action: "pull",
                branch: "main",
                commitSha: "1234abcd",
                workspaceDir: path.resolve("workspace/framework"),
                syncedAt: new Date().toISOString(),
                success: true
            };
        },
        async getStatus() {
            return {
                ready: true,
                branch: "main",
                workspaceDir: path.resolve("workspace/framework")
            };
        }
    };
}
describe("P6 approve workflow + step 12 LLM", () => {
    it("writes versioned rules.approved.json and knowledge index on approve", async () => {
        const testDir = await mkdtemp(path.join(os.tmpdir(), "p6-approve-"));
        tempDirs.push(testDir);
        const businessRules = await readFixture("05-business-rules.json");
        const mappedRules = await readFixture("06-business-rules-mapped.json");
        const { approvedRules, result } = await step18Approve({
            runId: "run-p6-test",
            productId: "bbps/ccbp",
            businessRules,
            mappedRules,
            projectRoot: testDir
        });
        expect(result.rulesApprovedVersion).toBe(1);
        expect(approvedRules.rules.length).toBeGreaterThan(0);
        const paths = await persistApprovedKnowledge({
            productId: "bbps/ccbp",
            sourceRunId: "run-p6-test",
            approvedRules,
            projectRoot: testDir
        });
        await access(paths.rulesApprovedPath);
        await access(paths.knowledgeIndexPath);
        const saved = JSON.parse(await readFile(paths.rulesApprovedPath, "utf8"));
        expect(saved.version).toBe(1);
        expect(saved.schemaVersion).toBe("rules-approved-v1");
    });
    it("generates heuristic custom assert bodies for path-based rules", async () => {
        const codegenRoot = await mkdtemp(path.join(os.tmpdir(), "p6-codegen-"));
        tempDirs.push(codegenRoot);
        const report = await step12CustomAsserts({
            productId: "bbps/ccbp",
            codegenRoot,
            mappedRules: {
                schemaVersion: "06-business-rules-mapped-v1",
                productId: "bbps/ccbp",
                mappings: [
                    {
                        ruleId: "TC-99_1_status_check",
                        status: "custom",
                        contextPath: "verify.status",
                        expected: 200
                    }
                ],
                pendingCustom: ["TC-99_1_status_check"],
                mappingMeta: {
                    totalRules: 1,
                    templateCount: 0,
                    customCount: 1,
                    nonAutomatableCount: 0,
                    approvedCount: 0,
                    mappingRate: 0,
                    targetMet: false
                }
            },
            businessRules: {
                schemaVersion: "05-business-rules-v1",
                productId: "bbps/ccbp",
                manualTcHash: "sha256:test",
                rules: [
                    {
                        ruleId: "TC-99_1_status_check",
                        caseId: "TC-99",
                        layer: "service",
                        source: "english",
                        text: "status=200",
                        path: "verify.status",
                        op: "equals",
                        expected: 200,
                        parseStatus: "parsed"
                    }
                ],
                unmappedRules: [],
                parseMeta: { totalExpected: 1, parsedCount: 1, parseRate: 1, targetMet: true }
            },
            assertionReport: {
                schemaVersion: "11-assertion-compile-report-v1",
                productId: "bbps/ccbp",
                repoRoot: "/tmp",
                generated: [],
                skipped: [],
                pendingCustom: ["TC-99_1_status_check"],
                errors: [],
                summary: { templateCount: 0, compiledLines: 0, generatedCount: 0, skippedCount: 0 }
            },
            persona: "new_user",
            llmClient: new HeuristicCustomAssertLlmClient(),
            useLlm: true
        });
        expect(report.generated.length).toBe(1);
        expect(report.pendingLlm.length).toBe(0);
    });
    it("approves a completed run via RunService", async () => {
        const testDir = await mkdtemp(path.join(os.tmpdir(), "p6-run-service-"));
        tempDirs.push(testDir);
        const runId = "run-p6-approve";
        const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));
        await artifactStore.writeJson(runId, "00-run-meta.json", {
            runId,
            productId: "bbps/ccbp",
            repoRoot: path.resolve("workspace/framework")
        });
        await artifactStore.writeJson(runId, "05-business-rules.json", await readFixture("05-business-rules.json"));
        await artifactStore.writeJson(runId, "06-business-rules-mapped.json", await readFixture("06-business-rules-mapped.json"));
        await artifactStore.writeJson(runId, "18-approval-manifest.json", {
            schemaVersion: "18-approval-manifest-v1",
            productId: "bbps/ccbp",
            runId,
            pendingRuleIds: [],
            pendingCustomAssertIds: [],
            unmappedManualSteps: [],
            approvalStatus: "none_required"
        });
        const service = new RunService(mockFrameworkService(), artifactStore, testDir);
        const details = await service.getRun(runId);
        expect(details.runId).toBe(runId);
        expect(details.artifacts["05-business-rules.json"]).toBeDefined();
        const approved = await service.approveRun(runId);
        expect(approved.approval.rulesApprovedVersion).toBe(1);
        expect(approved.approval.approvedRuleCount).toBeGreaterThan(0);
        const after = await service.getRun(runId);
        expect(after.approvalStatus).toBe("approved");
    });
});
