import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adaptApiContracts, materializeApiArtifacts } from "../../../src/adapters/api-contract.adapter.js";
import { adaptManualTestCases } from "../../../src/adapters/manual-test-case.adapter.js";
import { step1bManualTestCases } from "../../../src/pipelines/ingest/step-1b-manual-test-cases.js";
import { step3RepoIndex } from "../../../src/pipelines/ingest/step-3-repo-index.js";
import { step2mLinkJourney } from "../../../src/pipelines/linker/step-2m-link-journey.js";
import { loadAssertionCatalog } from "../../../src/pipelines/rules/load-rule-knowledge.js";
import { step5dBusinessRules } from "../../../src/pipelines/rules/step-5d-business-rules.js";
import { step6RuleMapper } from "../../../src/pipelines/rules/step-6-rule-mapper.js";
const frameworkRoot = path.resolve("workspace/framework");
const tc39ManualPath = path.resolve("inputs/bbps-ccbp/manual-test-cases.platform.json");
const tc39OpenApiPath = path.resolve("inputs/bbps-ccbp/api-contract.openapi.json");
describe("P1 repo index + rules pipeline", () => {
    it("indexes CCBP framework repo with steps, journeys, and assertions", async () => {
        const repoIndex = await step3RepoIndex({
            productId: "bbps/ccbp",
            repoRoot: frameworkRoot
        });
        expect(repoIndex.schemaVersion).toBe("03-repo-index-v1");
        expect(repoIndex.steps.some((entry) => entry.name === "homePageStep")).toBe(true);
        expect(repoIndex.journeys.some((entry) => entry.name === "runCcbpNewUserJourney")).toBe(true);
        expect(repoIndex.assertions.some((entry) => entry.name === "assertCcbpNewUserJourneyContracts")).toBe(true);
        expect(repoIndex.services.some((entry) => entry.className === "CcbpBillFetchService")).toBe(true);
        expect(repoIndex.referencePatterns.length).toBeGreaterThan(0);
    });
    it("parses TC39 expected results and maps rules to templates", async () => {
        const platformRaw = JSON.parse(await readFile(tc39ManualPath, "utf8"));
        const openApiRaw = JSON.parse(await readFile(tc39OpenApiPath, "utf8"));
        const manualInput = adaptManualTestCases(platformRaw);
        const manualCases = step1bManualTestCases({
            productId: "bbps/ccbp",
            rawCases: manualInput
        });
        const adapted = adaptApiContracts(openApiRaw, "bbps/ccbp");
        const ingestOut = materializeApiArtifacts(adapted, "bbps/ccbp");
        const journeySpec = step2mLinkJourney({
            productId: "bbps/ccbp",
            manualCases,
            apiContracts: ingestOut.apiContracts,
            dependencyGraph: ingestOut.dependencyGraph,
            mappingThreshold: 0.7,
            strictMapping: false
        });
        const businessRules = step5dBusinessRules({
            productId: "bbps/ccbp",
            manualCases,
            journeySpec
        });
        expect(businessRules.parseMeta.parseRate).toBeGreaterThanOrEqual(0.85);
        expect(businessRules.rules.length).toBeGreaterThan(0);
        const assertionCatalog = await loadAssertionCatalog();
        const mappedRules = step6RuleMapper({
            productId: "bbps/ccbp",
            businessRules,
            assertionCatalog
        });
        expect(mappedRules.mappingMeta.mappingRate).toBeGreaterThanOrEqual(0.9);
        expect(mappedRules.mappings.some((entry) => entry.status === "template")).toBe(true);
        expect(mappedRules.mappings.some((entry) => entry.templateId === "assert.ccbpNewUserJourneyContracts" || entry.templateId === "expect.length.zero")).toBe(true);
    });
});
