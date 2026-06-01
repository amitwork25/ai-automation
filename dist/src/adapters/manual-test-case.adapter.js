import { isPlatformManualResponse, parsePlatformManualResponse } from "./platform-manual-test.parser.js";
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asString(value, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}
function asStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((entry) => asString(entry)).filter(Boolean);
}
function unwrapManualPayload(raw) {
    if (!isRecord(raw)) {
        return raw;
    }
    if (isPlatformManualResponse(raw)) {
        return raw;
    }
    if (raw.manualTestCases !== undefined) {
        const nested = raw.manualTestCases;
        if (isRecord(nested) && isPlatformManualResponse(nested)) {
            return nested;
        }
        return nested;
    }
    if (raw.manualCases !== undefined) {
        return raw.manualCases;
    }
    if (raw.testCases !== undefined) {
        return raw.testCases;
    }
    return raw;
}
function parseApiRef(raw) {
    if (!isRecord(raw)) {
        return undefined;
    }
    const apiId = asString(raw.apiId || raw.api_id || raw.id);
    const method = asString(raw.method || raw.httpMethod || raw.verb).toUpperCase() || undefined;
    const pathHint = asString(raw.pathHint || raw.path || raw.url || raw.endpoint || raw.route || raw.path_hint);
    const apiNameHint = asString(raw.apiNameHint || raw.name || raw.apiName || raw.operation);
    if (!apiId && !method && !pathHint && !apiNameHint) {
        return undefined;
    }
    return {
        apiId: apiId || undefined,
        method,
        pathHint: pathHint || undefined,
        apiNameHint: apiNameHint || undefined
    };
}
function parseApiRefs(raw) {
    if (Array.isArray(raw)) {
        return raw.map((entry) => parseApiRef(entry)).filter((entry) => !!entry);
    }
    const single = parseApiRef(raw);
    return single ? [single] : [];
}
function parseFlexibleStep(raw) {
    if (typeof raw === "string") {
        return raw.trim();
    }
    if (!isRecord(raw)) {
        return "";
    }
    const action = asString(raw.action || raw.step || raw.testStep || raw.test_step || raw.description || raw.text);
    const expectedResults = asStringArray(raw.expectedResults || raw.expectedResult || raw.expected || raw.result || raw.results);
    const apiRefs = parseApiRefs(raw.apiRefs || raw.apis || raw.api || raw.apiRef || raw.endpoint);
    const stepType = asString(raw.stepType || raw.type).toLowerCase();
    if (apiRefs.length > 1) {
        return { action, expectedResults, apiRefs, stepType: stepType || undefined };
    }
    if (apiRefs.length === 1) {
        return { action, expectedResults, apiRef: apiRefs[0], stepType: stepType || undefined };
    }
    return { action, expectedResults, stepType: stepType || undefined };
}
function parseCase(raw, index) {
    const stepsRaw = raw.steps || raw.testSteps || raw.test_steps || raw.actions || raw.flow || raw.scenario;
    let steps = [];
    if (Array.isArray(stepsRaw)) {
        steps = stepsRaw.map((step) => parseFlexibleStep(step)).filter((step) => {
            if (typeof step === "string") {
                return step.length > 0;
            }
            return step.action.length > 0;
        });
    }
    const parallelExpected = asStringArray(raw.expectedResults || raw.expected_results);
    if (parallelExpected.length > 0 && steps.length === parallelExpected.length) {
        steps = steps.map((step, stepIndex) => {
            if (typeof step === "string") {
                return { action: step, expectedResults: [parallelExpected[stepIndex]] };
            }
            return {
                ...step,
                expectedResults: step.expectedResults?.length
                    ? step.expectedResults
                    : [parallelExpected[stepIndex]]
            };
        });
    }
    return {
        caseId: asString(raw.caseId || raw.id || raw.testCaseId, `MTC-${index + 1}`),
        title: asString(raw.title || raw.name || raw.summary, `Manual case ${index + 1}`),
        persona: asString(raw.persona || raw.userType || raw.user_type, "default_user"),
        journeyTags: asStringArray(raw.journeyTags || raw.journey_tags || raw.tags || raw.journey).length
            ? asStringArray(raw.journeyTags || raw.journey_tags || raw.tags || raw.journey)
            : ["default"],
        steps,
        expectedResults: parallelExpected
    };
}
function isManualCaseShape(raw) {
    return (Array.isArray(raw.steps) ||
        Array.isArray(raw.testSteps) ||
        Array.isArray(raw.test_steps) ||
        Array.isArray(raw.actions));
}
/**
 * Accepts flexible manual-test JSON and normalizes to internal ManualTestCaseInput[].
 */
export function adaptManualTestCases(raw, productId) {
    const payload = unwrapManualPayload(raw);
    if (isRecord(payload) && isPlatformManualResponse(payload)) {
        return parsePlatformManualResponse(payload);
    }
    if (Array.isArray(payload)) {
        if (payload.length === 0) {
            return [];
        }
        if (typeof payload[0] === "string") {
            return [
                {
                    caseId: "MTC-1",
                    title: `${productId} journey`,
                    persona: "default_user",
                    journeyTags: ["default"],
                    steps: payload.map((step) => asString(step)).filter(Boolean)
                }
            ];
        }
        if (isRecord(payload[0]) && isManualCaseShape(payload[0])) {
            return payload.filter(isRecord).map((entry, index) => parseCase(entry, index));
        }
        if (isRecord(payload[0])) {
            const maybePairs = payload.filter(isRecord);
            const hasStepExpectedPair = maybePairs.every((entry) => asString(entry.action || entry.step || entry.testStep) &&
                asString(entry.expected || entry.expectedResult || entry.result));
            if (hasStepExpectedPair) {
                return [
                    {
                        caseId: "MTC-1",
                        title: `${productId} journey`,
                        persona: "default_user",
                        journeyTags: ["default"],
                        steps: maybePairs.map((entry) => parseFlexibleStep(entry))
                    }
                ];
            }
        }
    }
    if (isRecord(payload)) {
        if (Array.isArray(payload.cases)) {
            return payload.cases.filter(isRecord).map((entry, index) => parseCase(entry, index));
        }
        if (isManualCaseShape(payload)) {
            return [parseCase(payload, 0)];
        }
        const testSteps = asStringArray(payload.testSteps || payload.test_steps);
        const expectedResults = asStringArray(payload.expectedResults || payload.expected_results);
        if (testSteps.length > 0) {
            const steps = expectedResults.length === testSteps.length
                ? testSteps.map((step, index) => ({
                    action: step,
                    expectedResults: [expectedResults[index]]
                }))
                : testSteps;
            return [
                {
                    caseId: asString(payload.caseId, "MTC-1"),
                    title: asString(payload.title, `${productId} journey`),
                    persona: asString(payload.persona, "default_user"),
                    journeyTags: asStringArray(payload.journeyTags).length
                        ? asStringArray(payload.journeyTags)
                        : ["default"],
                    steps
                }
            ];
        }
    }
    throw new Error("Unsupported manual test case format. Provide cases/steps/testSteps with actions and optional apiRef.");
}
