import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adaptManualTestCases } from "../../../src/adapters/manual-test-case.adapter.js";
import { parseInterleavedStepLines, parsePlatformManualResponse, parseStepEndpoints } from "../../../src/adapters/platform-manual-test.parser.js";
import { step1bManualTestCases } from "../../../src/pipelines/ingest/step-1b-manual-test-cases.js";
describe("platform-manual-test.parser", () => {
    it("parses TC39 platform export into 12 interleaved steps", async () => {
        const filePath = path.resolve("inputs/bbps-ccbp/manual-test-cases.platform.json");
        const platform = JSON.parse(await readFile(filePath, "utf8"));
        const adapted = parsePlatformManualResponse(platform);
        expect(adapted).toHaveLength(1);
        expect(adapted[0].caseId).toBe("TC-39");
        expect(adapted[0].title).toBe("New user CCBP credit card journey");
        expect(adapted[0].persona).toBe("new_user");
        expect(adapted[0].journeyTags).toContain("ccbp_new_user_journey");
        expect(adapted[0].steps).toHaveLength(12);
        const firstStep = adapted[0].steps[0];
        expect(typeof firstStep).not.toBe("string");
        if (typeof firstStep !== "string") {
            expect(firstStep.action).toContain("Open the app as a new Credit Card BBPS user");
            expect(firstStep.expectedResults?.[0]).toContain("without already having a paid bill");
        }
    });
    it("materializes 01b artifact from platform TC39 file", async () => {
        const filePath = path.resolve("inputs/bbps-ccbp/manual-test-cases.platform.json");
        const platform = JSON.parse(await readFile(filePath, "utf8"));
        const normalized = adaptManualTestCases(platform, "bbps/ccbp");
        const artifact = step1bManualTestCases({
            productId: "bbps/ccbp",
            rawCases: normalized
        });
        expect(artifact.cases).toHaveLength(1);
        expect(artifact.cases[0].caseId).toBe("TC-39");
        expect(artifact.cases[0].steps).toHaveLength(12);
        expect(artifact.manualTcHash).toMatch(/^sha256:/);
    });
    it("parses full endpoint path and METHOD path in endpoint key", () => {
        const endpoints = parseStepEndpoints("null\r\nPOST /auth/send-otp,POST /auth/verify-otp\r\nPUT /update-customer-details\r\n/bbps/v1/billDesk/bbps/bill-fetch");
        expect(endpoints[1]).toEqual([
            { method: "POST", pathHint: "/auth/send-otp" },
            { method: "POST", pathHint: "/auth/verify-otp" }
        ]);
        expect(endpoints[2]).toEqual([{ method: "PUT", pathHint: "/update-customer-details" }]);
        expect(endpoints[3]).toEqual([{ pathHint: "/bbps/v1/billDesk/bbps/bill-fetch" }]);
    });
    it("parses endpoint key aligned to action steps", async () => {
        const filePath = path.resolve("inputs/bbps-ccbp/manual-test-cases.platform.json");
        const platform = JSON.parse(await readFile(filePath, "utf8"));
        const adapted = parsePlatformManualResponse(platform);
        expect(adapted[0].steps).toHaveLength(12);
        const openBbpsStep = adapted[0].steps[3];
        const browseStep = adapted[0].steps[7];
        const pickNetworkStep = adapted[0].steps[8];
        const fetchBillStep = adapted[0].steps[10];
        expect(typeof openBbpsStep).not.toBe("string");
        expect(typeof browseStep).not.toBe("string");
        expect(typeof pickNetworkStep).not.toBe("string");
        expect(typeof fetchBillStep).not.toBe("string");
        if (typeof openBbpsStep !== "string" &&
            typeof browseStep !== "string" &&
            typeof pickNetworkStep !== "string" &&
            typeof fetchBillStep !== "string") {
            expect(openBbpsStep.stepType).toBe("api");
            expect(openBbpsStep.apiRefs?.length).toBe(4);
            expect(openBbpsStep.apiRefs?.[0].pathHint).toBe("/bbps/v1/billDesk/customer-profile");
            expect(browseStep.apiRefs?.length).toBe(2);
            expect(pickNetworkStep.apiRefs?.length).toBe(2);
            expect(fetchBillStep.apiRefs?.length).toBe(3);
            expect(fetchBillStep.apiRefs?.[0].method).toBe("POST");
        }
        const uiStep = adapted[0].steps[0];
        if (typeof uiStep !== "string") {
            expect(uiStep.stepType).toBe("ui");
        }
    });
    it("parses arrow-separated single-line steps", () => {
        const steps = parseInterleavedStepLines("Open app → enter mobile → enter wrong OTP → submit.");
        expect(steps).toHaveLength(4);
        expect(steps[0].action).toBe("Open app");
    });
});
