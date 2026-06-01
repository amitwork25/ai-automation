const ENGLISH_RULE_PATTERNS = [
    {
        pattern: /update is accepted|no blocking validation error/i,
        build: () => ({
            layer: "journey",
            assertFn: "assertUpdateCustomerDetailsAccepted"
        })
    },
    {
        pattern: /empty list.*₹0 total due|no saved cards yet/i,
        build: () => [
            { layer: "journey", path: "homepage.data.bills", op: "length", expected: 0 },
            { layer: "journey", path: "homepage.data.totalDueAmount", op: "equals", expected: 0 },
            { layer: "journey", path: "homepage.data.isStashGaurdEnabled", op: "equals", expected: false },
            { layer: "journey", path: "homepage.data.hasUserClaimedGoldReward", op: "equals", expected: false }
        ]
    },
    {
        pattern: /stashguard off/i,
        build: () => ({ layer: "journey", path: "homepage.data.isStashGaurdEnabled", op: "equals", expected: false })
    },
    {
        pattern: /no gold reward claimed/i,
        build: () => ({
            layer: "journey",
            path: "homepage.data.hasUserClaimedGoldReward",
            op: "equals",
            expected: false
        })
    },
    {
        pattern: /bureau.*empty|no bureau-sourced cards/i,
        build: () => ({ layer: "journey", path: "bureau.data.bureauBills", op: "length", expected: 0 })
    },
    {
        pattern: /profile shows a real user|customer-profile|customer profile/i,
        build: () => [
            { layer: "journey", path: "customerProfile.customer_id", op: "gt", expected: 0 },
            { layer: "journey", path: "customerProfile.customer_name", op: "present", expected: true },
            { layer: "journey", path: "customerProfile.email", op: "present", expected: true },
            { layer: "journey", path: "customerProfile.is_new_ccbp_flow", op: "equals", expected: true }
        ]
    },
    {
        pattern: /providers.*not empty|list of providers is not empty/i,
        build: () => ({ layer: "journey", path: "providers", op: "length_gt", expected: 0 })
    },
    {
        pattern: /variants screen|popular and other options|major networks|visa.*mastercard/i,
        build: () => [
            { layer: "journey", path: "variants.data.variants.popularVariants", op: "length_gt", expected: 0 },
            { layer: "journey", path: "variants.data.networks", op: "contains_all", expected: ["Visa", "Mastercard"] }
        ]
    },
    {
        pattern: /details match the chosen biller|provider details/i,
        build: () => ({ layer: "journey", path: "providerDetails.data.biller_id", op: "present", expected: true })
    },
    {
        pattern: /bill is found|due amount and status look valid/i,
        build: () => ({ layer: "journey", assertFn: "assertCcbpNewUserJourneyContracts" })
    },
    {
        pattern: /at least one credit card bill appears|utilities list after fetch/i,
        build: () => ({ layer: "journey", path: "utilitiesBills", op: "length_gte", expected: 1 })
    },
    {
        pattern: /login succeeds|session is established/i,
        build: () => ({ layer: "service", path: "verify.status", op: "equals", expected: 200 })
    },
    {
        pattern: /lands on|entry is available|can start the journey|can proceed without|blocking validation/i,
        build: () => ({ layer: "non_automatable" })
    }
];
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48);
}
function lookupJourneyContext(journeySpec, caseId, manualStepIndex) {
    for (const journey of journeySpec.journeys) {
        if (!journey.sourceCaseIds.includes(caseId)) {
            continue;
        }
        const mapping = journey.stepMappings.find((entry) => entry.caseId === caseId && entry.manualStepIndex === manualStepIndex);
        if (mapping) {
            return { journeyId: journey.journeyId, apiIds: mapping.apiIds };
        }
    }
    const journey = journeySpec.journeys.find((entry) => entry.sourceCaseIds.includes(caseId));
    return journey ? { journeyId: journey.journeyId } : {};
}
function parseEnglishExpected(text) {
    for (const entry of ENGLISH_RULE_PATTERNS) {
        if (!entry.pattern.test(text)) {
            continue;
        }
        const built = entry.build(text);
        if (!built) {
            return [];
        }
        return Array.isArray(built) ? built : [built];
    }
    return [];
}
function pushRule(rules, unmappedRules, input) {
    const baseId = `${input.caseId}_${input.manualStepIndex ?? "x"}_${slugify(input.text)}`;
    if (input.hint) {
        rules.push({
            ruleId: `${baseId}_hint`,
            caseId: input.caseId,
            layer: "journey",
            source: "assertionHint",
            text: input.text,
            manualStepIndex: input.manualStepIndex,
            journeyId: input.journeyId,
            apiIds: input.apiIds,
            path: input.hint.path,
            op: input.hint.op,
            expected: input.hint.value,
            parseStatus: "parsed"
        });
        return;
    }
    if (input.parsed) {
        if (input.parsed.layer === "non_automatable") {
            rules.push({
                ruleId: `${baseId}_na`,
                caseId: input.caseId,
                layer: "non_automatable",
                source: input.source,
                text: input.text,
                manualStepIndex: input.manualStepIndex,
                journeyId: input.journeyId,
                apiIds: input.apiIds,
                parseStatus: "parsed"
            });
            return;
        }
        rules.push({
            ruleId: `${baseId}_${rules.length}`,
            caseId: input.caseId,
            layer: input.parsed.layer,
            source: input.source,
            text: input.text,
            manualStepIndex: input.manualStepIndex,
            journeyId: input.journeyId,
            apiIds: input.apiIds,
            path: input.parsed.path,
            op: input.parsed.op,
            expected: input.parsed.expected,
            assertFn: input.parsed.assertFn,
            parseStatus: "parsed"
        });
        return;
    }
    unmappedRules.push({
        caseId: input.caseId,
        text: input.text,
        manualStepIndex: input.manualStepIndex
    });
    rules.push({
        ruleId: `${baseId}_unmapped`,
        caseId: input.caseId,
        layer: "journey",
        source: input.source,
        text: input.text,
        manualStepIndex: input.manualStepIndex,
        journeyId: input.journeyId,
        apiIds: input.apiIds,
        parseStatus: "unmapped"
    });
}
export function step5dBusinessRules(input) {
    const parseThreshold = input.parseThreshold ?? 0.85;
    const rules = [];
    const unmappedRules = [];
    let totalExpected = 0;
    let parsedCount = 0;
    for (const testCase of input.manualCases.cases) {
        testCase.assertionHints.forEach((hint, index) => {
            totalExpected += 1;
            parsedCount += 1;
            const context = lookupJourneyContext(input.journeySpec, testCase.caseId, index + 1);
            pushRule(rules, unmappedRules, {
                caseId: testCase.caseId,
                text: `${hint.path} ${hint.op} ${JSON.stringify(hint.value)}`,
                manualStepIndex: index + 1,
                journeyId: context.journeyId,
                apiIds: context.apiIds,
                source: "assertionHint",
                hint: { path: hint.path, op: hint.op, value: hint.value }
            });
        });
        testCase.expectedResults.forEach((expectedText, index) => {
            totalExpected += 1;
            const manualStepIndex = index + 1;
            const context = lookupJourneyContext(input.journeySpec, testCase.caseId, manualStepIndex);
            const parsedRules = parseEnglishExpected(expectedText);
            if (parsedRules.length === 0) {
                pushRule(rules, unmappedRules, {
                    caseId: testCase.caseId,
                    text: expectedText,
                    manualStepIndex,
                    journeyId: context.journeyId,
                    apiIds: context.apiIds,
                    source: "english"
                });
                return;
            }
            parsedCount += 1;
            for (const parsed of parsedRules) {
                pushRule(rules, unmappedRules, {
                    caseId: testCase.caseId,
                    text: expectedText,
                    manualStepIndex,
                    journeyId: context.journeyId,
                    apiIds: context.apiIds,
                    source: "parsedExpected",
                    parsed
                });
            }
        });
    }
    const parseRate = totalExpected === 0 ? 1 : Number((parsedCount / totalExpected).toFixed(3));
    return {
        schemaVersion: "05-business-rules-v1",
        productId: input.productId,
        manualTcHash: input.manualCases.manualTcHash,
        rules,
        unmappedRules,
        parseMeta: {
            totalExpected,
            parsedCount,
            parseRate,
            targetMet: parseRate >= parseThreshold
        }
    };
}
