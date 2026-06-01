import { describe, expect, it } from "vitest";
import { step1bManualTestCases } from "../../../src/pipelines/ingest/step-1b-manual-test-cases.js";
import { step2mLinkJourney } from "../../../src/pipelines/linker/step-2m-link-journey.js";
describe("linker apiRef-only mode", () => {
    it("maps only explicit apiRef steps without aliases", () => {
        const manualCases = step1bManualTestCases({
            productId: "bbps/ccbp",
            rawCases: [
                {
                    caseId: "MTC-1",
                    title: "Journey",
                    persona: "new_user",
                    journeyTags: ["bill_discovery"],
                    steps: [
                        { action: "Open app", stepType: "ui" },
                        {
                            action: "Login",
                            stepType: "api",
                            apiRefs: [
                                { apiId: "auth.send_otp" },
                                { apiId: "auth.verify_otp" }
                            ]
                        },
                        {
                            action: "Fetch bill",
                            stepType: "api",
                            apiRef: { apiId: "ccbp.bill_fetch" }
                        }
                    ]
                }
            ]
        });
        const journeySpec = step2mLinkJourney({
            productId: "bbps/ccbp",
            manualCases,
            apiContracts: {
                apis: [
                    { apiId: "auth.send_otp", method: "POST", path: "/auth/send-otp", requestRequired: [], responseFields: [] },
                    { apiId: "auth.verify_otp", method: "POST", path: "/auth/verify-otp", requestRequired: [], responseFields: [] },
                    { apiId: "ccbp.bill_fetch", method: "POST", path: "/bbps/v1/ccbp/bill-fetch", requestRequired: [], responseFields: [] }
                ]
            },
            dependencyGraph: { edges: [], executionLayers: [] },
            mappingThreshold: 1,
            strictMapping: true
        });
        expect(journeySpec.mappingMeta.mappingRate).toBe(1);
        expect(journeySpec.unmapped).toHaveLength(0);
        expect(journeySpec.journeys[0].stepMappings[0].matchMethod).toBe("apiRef:apiId");
    });
});
