import { describe, expect, it } from "vitest";
import { adaptManualTestCases } from "../../../src/adapters/manual-test-case.adapter.js";
describe("manual-test-case.adapter", () => {
    it("adapts journey object with per-step action, expected, and apiRef", () => {
        const adapted = adaptManualTestCases({
            caseId: "MTC-CCBP-NEW-USER-001",
            title: "CCBP new user journey",
            persona: "new_user",
            journeyTags: ["ccbp_new_user_journey"],
            steps: [
                {
                    stepId: "S01",
                    stepType: "ui",
                    action: "Open the app as a new Credit Card BBPS user.",
                    expectedResults: ["User can start without paid bill on home list."]
                },
                {
                    stepId: "S02",
                    stepType: "api",
                    action: "Log in with mobile and complete OTP.",
                    expectedResults: ["Login succeeds; session is established."],
                    apiRefs: [
                        { apiId: "auth.send_otp", method: "POST" },
                        { apiId: "auth.verify_otp", method: "POST" }
                    ]
                },
                {
                    stepId: "S11",
                    stepType: "api",
                    action: "Enter card details and fetch bill.",
                    expectedResults: ["Bill is found; due amount and status look valid."],
                    apiRef: { apiId: "ccbp.bill_fetch", method: "POST", pathHint: "/bbps/v1/ccbp/bill-fetch" }
                }
            ]
        }, "bbps/ccbp");
        expect(adapted).toHaveLength(1);
        expect(adapted[0].steps).toHaveLength(3);
        const secondStep = adapted[0].steps[1];
        expect(typeof secondStep).not.toBe("string");
        if (typeof secondStep !== "string") {
            expect(secondStep.apiRefs?.length).toBe(2);
        }
    });
    it("adapts parallel testSteps and expectedResults arrays", () => {
        const adapted = adaptManualTestCases({
            testSteps: ["Open app", "Login with OTP"],
            expectedResults: ["App opens", "Login succeeds"]
        }, "bbps/ccbp");
        expect(adapted[0].steps).toHaveLength(2);
        const first = adapted[0].steps[0];
        expect(typeof first).not.toBe("string");
        if (typeof first !== "string") {
            expect(first.expectedResults).toEqual(["App opens"]);
        }
    });
});
