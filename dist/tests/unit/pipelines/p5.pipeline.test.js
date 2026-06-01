import path from "node:path";
import { describe, expect, it } from "vitest";
import { HeuristicRuleGapLlmClient } from "../../../src/infrastructure/llm/rule-gap-llm.client.js";
import { step5gRuleGaps } from "../../../src/pipelines/rules/step-5g-rule-gaps.js";
import { step3aVectorIndex } from "../../../src/pipelines/vector/step-3a-vector-index.js";
import { step3bVectorRetrieve } from "../../../src/pipelines/vector/step-3b-vector-retrieve.js";
import { MemoryVectorStore } from "../../../src/pipelines/vector/memory-vector-store.js";
const frameworkRoot = path.resolve("workspace/framework");
const p3FixturesDir = path.resolve("runs/p3-verify-1780145671232");
async function readFixture(name) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(path.join(p3FixturesDir, name), "utf8"));
}
describe("P5 vector + rule gaps", () => {
    it("scores similar manual TC and code assert snippets", () => {
        const store = new MemoryVectorStore();
        store.index([
            {
                id: "manual:1",
                collection: "manual_tc",
                text: "Bill is found; due amount and status look valid",
                metadata: {}
            },
            {
                id: "assert:1",
                collection: "code_asserts",
                text: "export function assertCcbpNewUserJourneyContracts(ctx) { expect(ctx.billFetch).toBeTruthy(); }",
                metadata: {}
            },
            {
                id: "api:1",
                collection: "api_contracts",
                text: "ccbp.bill_fetch POST /bbps/v1/billDesk/bbps/bill-fetch",
                metadata: {}
            }
        ]);
        const hits = store.search("bill is found due amount status valid", { topK: 3 });
        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0]?.collection).toBe("manual_tc");
    });
    it("indexes manual TC, APIs, and repo symbols into 03a", async () => {
        const { report } = await step3aVectorIndex({
            productId: "bbps/ccbp",
            repoRoot: frameworkRoot,
            manualCases: await readFixture("01b-manual-test-cases.json"),
            apiContracts: await readFixture("02-api-contracts.json"),
            repoIndex: await readFixture("03-repo-index.json")
        });
        expect(report.schemaVersion).toBe("03a-index-report-v1");
        expect(report.summary.totalDocuments).toBeGreaterThan(10);
        expect(report.collectionCounts.manual_tc).toBeGreaterThan(0);
        expect(report.collectionCounts.api_contracts).toBeGreaterThan(0);
        expect(report.collectionCounts.code_asserts).toBeGreaterThan(0);
    });
    it("retrieves context snippets for expected results into 03b", async () => {
        const manualCases = await readFixture("01b-manual-test-cases.json");
        const { report } = await step3aVectorIndex({
            productId: "bbps/ccbp",
            repoRoot: frameworkRoot,
            manualCases,
            apiContracts: await readFixture("02-api-contracts.json"),
            repoIndex: await readFixture("03-repo-index.json")
        });
        const retrieval = step3bVectorRetrieve({
            productId: "bbps/ccbp",
            manualCases,
            indexReport: report
        });
        expect(retrieval.schemaVersion).toBe("03b-retrieval-context-v1");
        expect(retrieval.summary.queryCount).toBeGreaterThan(0);
        expect(retrieval.results.some((entry) => entry.hits.length > 0)).toBe(true);
    });
    it("resolves unmapped rules via heuristic 5g using retrieval context", async () => {
        const businessRules = {
            schemaVersion: "05-business-rules-v1",
            productId: "bbps/ccbp",
            manualTcHash: "sha256:test",
            rules: [
                {
                    ruleId: "TC-99_1_custom_bill_validation_unmapped",
                    caseId: "TC-99",
                    layer: "journey",
                    source: "english",
                    text: "Bill is found; due amount and status look valid",
                    manualStepIndex: 1,
                    parseStatus: "unmapped"
                }
            ],
            unmappedRules: [
                {
                    caseId: "TC-99",
                    text: "Bill is found; due amount and status look valid",
                    manualStepIndex: 1
                }
            ],
            parseMeta: {
                totalExpected: 1,
                parsedCount: 0,
                parseRate: 0,
                targetMet: false
            }
        };
        const { businessRules: patched, report } = await step5gRuleGaps({
            productId: "bbps/ccbp",
            businessRules,
            retrievalContext: {
                schemaVersion: "03b-retrieval-context-v1",
                productId: "bbps/ccbp",
                manualTcHash: "sha256:test",
                topK: 3,
                results: [
                    {
                        queryId: "TC-99:1",
                        caseId: "TC-99",
                        manualStepIndex: 1,
                        queryText: "Bill is found; due amount and status look valid",
                        hits: [
                            {
                                documentId: "assert:1",
                                collection: "code_asserts",
                                score: 0.8,
                                text: "export function assertCcbpNewUserJourneyContracts(ctx) {}",
                                metadata: {}
                            }
                        ]
                    }
                ],
                summary: { queryCount: 1, hitCount: 1 }
            },
            llmClient: new HeuristicRuleGapLlmClient()
        });
        expect(report.resolvedCount).toBe(1);
        expect(patched.unmappedRules).toHaveLength(0);
        expect(patched.rules[0]?.assertFn).toBe("assertCcbpNewUserJourneyContracts");
        expect(patched.parseMeta.parseRate).toBe(1);
    });
    it("skips 5g when no unmapped rules remain after 5d", async () => {
        const businessRules = await readFixture("05-business-rules.json");
        const { report } = await step5gRuleGaps({
            productId: "bbps/ccbp",
            businessRules,
            llmClient: new HeuristicRuleGapLlmClient()
        });
        expect(report.inputCount).toBe(0);
        expect(report.resolvedCount).toBe(0);
    });
});
