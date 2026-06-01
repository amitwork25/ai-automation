import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadProductStepMap } from "../../../src/pipelines/knowledge/load-product-knowledge.js";
import { step9ApiCodegen } from "../../../src/pipelines/codegen/step-9-api-codegen.js";
import { step10ServiceTestCodegen } from "../../../src/pipelines/codegen/step-10-service-test-codegen.js";
const tempDirs = [];
afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
const sampleApi = {
    apiId: "ccbp.homepage_reminders",
    method: "GET",
    path: "/bbps/v1/billDesk/homepage/reminders",
    auth: "bearer",
    responseSchemaRef: "HomepageRemindersResponse",
    requestRequired: [],
    responseFields: ["success", "data"]
};
const emptyRepoIndex = (repoRoot) => ({
    schemaVersion: "03-repo-index-v1",
    productId: "bbps/ccbp",
    repoRoot,
    services: [],
    steps: [],
    journeys: [],
    assertions: [],
    specs: [],
    folderLayout: {},
    referencePatterns: []
});
describe("P2 API + service test codegen", () => {
    it("generates model, schema, and service files for a missing API", async () => {
        const repoRoot = await mkdtemp(path.join(os.tmpdir(), "p2-greenfield-"));
        tempDirs.push(repoRoot);
        const report = await step9ApiCodegen({
            productId: "bbps/ccbp",
            repoRoot,
            apiContracts: { productId: "bbps/ccbp", apis: [sampleApi] },
            schemaIndex: {
                schemas: {
                    HomepageRemindersResponse: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: { type: "object" }
                        }
                    }
                },
                unresolvedRefs: []
            },
            repoIndex: emptyRepoIndex(repoRoot)
        });
        expect(report.summary.generatedCount).toBe(1);
        expect(report.generated[0]?.files).toEqual(expect.arrayContaining([
            "src/models/eqx/bbps/ccbp/homepage-reminders.models.ts",
            "src/schemas/eqx/bbps/ccbp/homepage-reminders-response.schema.json",
            "src/services/eqx/bbps/ccbp/CcbpHomepageRemindersService.ts"
        ]));
        const serviceSource = await readFile(path.join(repoRoot, "src/services/eqx/bbps/ccbp/CcbpHomepageRemindersService.ts"), "utf8");
        expect(serviceSource).toContain("class CcbpHomepageRemindersService");
        expect(serviceSource).toContain("/bbps/v1/billDesk/homepage/reminders");
    });
    it("skips APIs that already exist in the repo index", async () => {
        const repoRoot = await mkdtemp(path.join(os.tmpdir(), "p2-skip-"));
        tempDirs.push(repoRoot);
        const report = await step9ApiCodegen({
            productId: "bbps/ccbp",
            repoRoot,
            apiContracts: {
                productId: "bbps/ccbp",
                apis: [
                    sampleApi,
                    {
                        apiId: "ccbp.bill_fetch",
                        method: "POST",
                        path: "/bbps/v1/billDesk/bbps/bill-fetch",
                        responseSchemaRef: "CcbpBillFetchResponse",
                        requestSchemaRef: "CcbpBillFetchRequest",
                        requestRequired: ["billerId"],
                        responseFields: ["validation_id"]
                    }
                ]
            },
            schemaIndex: { schemas: {}, unresolvedRefs: [] },
            repoIndex: {
                schemaVersion: "03-repo-index-v1",
                productId: "bbps/ccbp",
                repoRoot,
                services: [{ className: "CcbpBillFetchService", filePath: "src/services/eqx/bbps/ccbp/CcbpBillFetchService.ts" }],
                steps: [],
                journeys: [],
                assertions: [],
                specs: [],
                folderLayout: {},
                referencePatterns: []
            }
        });
        expect(report.skipped.some((entry) => entry.apiId === "ccbp.bill_fetch")).toBe(true);
        expect(report.generated.some((entry) => entry.apiId === "ccbp.homepage_reminders")).toBe(true);
    });
    it("generates a smoke service spec for newly generated APIs", async () => {
        const repoRoot = await mkdtemp(path.join(os.tmpdir(), "p2-spec-"));
        tempDirs.push(repoRoot);
        const apiReport = await step9ApiCodegen({
            productId: "bbps/ccbp",
            repoRoot,
            apiContracts: { productId: "bbps/ccbp", apis: [sampleApi] },
            schemaIndex: {
                schemas: {
                    HomepageRemindersResponse: {
                        type: "object",
                        properties: { success: { type: "boolean" } }
                    }
                },
                unresolvedRefs: []
            },
            repoIndex: emptyRepoIndex(repoRoot)
        });
        expect(apiReport.summary.generatedCount).toBe(1);
        const stepMap = await loadProductStepMap("bbps/ccbp");
        const specReport = await step10ServiceTestCodegen({
            productId: "bbps/ccbp",
            codegenRoot: repoRoot,
            apiContracts: { productId: "bbps/ccbp", apis: [sampleApi] },
            repoIndex: emptyRepoIndex(repoRoot),
            apiCodegenReport: apiReport,
            stepMap
        });
        expect(specReport.summary.generatedCount).toBe(1);
        const specSource = await readFile(path.join(repoRoot, "tests/service/bbps/ccbp/homepage-reminders/homepage-reminders.service.spec.ts"), "utf8");
        expect(specSource).toContain("CcbpHomepageRemindersService");
    });
});
