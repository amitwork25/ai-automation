import { describe, expect, it } from "vitest";
import { includeApiLayer, includeJourneyLayer, parseAutomationCodegenMode } from "../../src/config/automation-codegen-mode.js";
describe("automation-codegen-mode", () => {
    it("parses journey, api, and both", () => {
        expect(parseAutomationCodegenMode("journey")).toBe("journey");
        expect(parseAutomationCodegenMode("API")).toBe("api");
        expect(parseAutomationCodegenMode("both")).toBe("both");
        expect(parseAutomationCodegenMode("unknown")).toBe("both");
    });
    it("selects layers per mode", () => {
        expect(includeApiLayer("journey")).toBe(false);
        expect(includeJourneyLayer("journey")).toBe(true);
        expect(includeApiLayer("api")).toBe(true);
        expect(includeJourneyLayer("api")).toBe(false);
        expect(includeApiLayer("both")).toBe(true);
        expect(includeJourneyLayer("both")).toBe(true);
    });
});
