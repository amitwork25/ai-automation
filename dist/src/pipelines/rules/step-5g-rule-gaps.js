import { resolveLlmProvider } from "../../config/llm.config.js";
function reportProvider() {
    return resolveLlmProvider();
}
function applyResolution(rule, resolution) {
    if (resolution.parseStatus !== "parsed") {
        return rule;
    }
    if (resolution.layer === "non_automatable") {
        return {
            ...rule,
            layer: "non_automatable",
            parseStatus: "parsed",
            path: undefined,
            op: undefined,
            expected: undefined,
            assertFn: undefined
        };
    }
    return {
        ...rule,
        layer: resolution.layer,
        path: resolution.path,
        op: resolution.op,
        expected: resolution.expected,
        assertFn: resolution.assertFn,
        parseStatus: "parsed"
    };
}
export async function step5gRuleGaps(input) {
    const unmappedRules = input.businessRules.unmappedRules;
    if (unmappedRules.length === 0) {
        return {
            businessRules: input.businessRules,
            report: {
                schemaVersion: "05g-rule-gaps-report-v1",
                productId: input.productId,
                provider: reportProvider(),
                inputCount: 0,
                resolvedCount: 0,
                remainingCount: 0,
                resolutions: []
            }
        };
    }
    const resolutions = await input.llmClient.resolveRuleGaps({
        productId: input.productId,
        unmappedRules,
        retrievalContext: input.retrievalContext?.results.map((entry) => ({
            caseId: entry.caseId,
            manualStepIndex: entry.manualStepIndex,
            queryText: entry.queryText,
            hits: entry.hits.map((hit) => ({ collection: hit.collection, text: hit.text }))
        }))
    });
    const resolutionByKey = new Map(resolutions.map((resolution) => [
        `${resolution.caseId}:${resolution.manualStepIndex ?? "x"}:${resolution.text.trim()}`,
        resolution
    ]));
    const updatedRules = input.businessRules.rules.map((rule) => {
        if (rule.parseStatus !== "unmapped") {
            return rule;
        }
        const key = `${rule.caseId}:${rule.manualStepIndex ?? "x"}:${rule.text.trim()}`;
        const resolution = resolutionByKey.get(key);
        if (!resolution) {
            return rule;
        }
        return applyResolution(rule, resolution);
    });
    const remainingUnmapped = unmappedRules.filter((entry) => {
        const key = `${entry.caseId}:${entry.manualStepIndex ?? "x"}:${entry.text.trim()}`;
        const resolution = resolutionByKey.get(key);
        return !resolution || resolution.parseStatus !== "parsed";
    });
    const parsedCount = input.businessRules.parseMeta.parsedCount +
        resolutions.filter((resolution) => resolution.parseStatus === "parsed").length;
    const totalExpected = input.businessRules.parseMeta.totalExpected;
    const parseRate = totalExpected === 0 ? 1 : Number((parsedCount / totalExpected).toFixed(3));
    return {
        businessRules: {
            ...input.businessRules,
            rules: updatedRules,
            unmappedRules: remainingUnmapped,
            parseMeta: {
                ...input.businessRules.parseMeta,
                parsedCount,
                parseRate,
                targetMet: parseRate >= 0.85
            }
        },
        report: {
            schemaVersion: "05g-rule-gaps-report-v1",
            productId: input.productId,
            provider: reportProvider(),
            inputCount: unmappedRules.length,
            resolvedCount: resolutions.filter((resolution) => resolution.parseStatus === "parsed").length,
            remainingCount: remainingUnmapped.length,
            resolutions
        }
    };
}
