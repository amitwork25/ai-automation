function normalizeText(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function stripQuery(path) {
    return path.split("?")[0];
}
function pathSegments(path) {
    return stripQuery(path)
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean);
}
function pathsMatch(pathHint, contractPath) {
    const hintParts = pathSegments(pathHint);
    const contractParts = pathSegments(contractPath);
    if (hintParts.length !== contractParts.length) {
        return false;
    }
    return hintParts.every((part, index) => {
        const contractPart = contractParts[index];
        if (contractPart.startsWith("{") && contractPart.endsWith("}")) {
            return part.length > 0;
        }
        return part.toLowerCase() === contractPart.toLowerCase();
    });
}
function tokenize(value) {
    return new Set(normalizeText(value).split(" ").filter(Boolean));
}
function jaccardScore(left, right) {
    const leftTokens = tokenize(left);
    const rightTokens = tokenize(right);
    if (leftTokens.size === 0 || rightTokens.size === 0) {
        return 0;
    }
    let common = 0;
    leftTokens.forEach((token) => {
        if (rightTokens.has(token)) {
            common += 1;
        }
    });
    const union = new Set([...leftTokens, ...rightTokens]).size;
    return common / union;
}
function trigrams(value) {
    const text = normalizeText(value).replace(/\s+/g, "_");
    if (text.length < 3) {
        return new Set([text]);
    }
    const grams = new Set();
    for (let i = 0; i <= text.length - 3; i += 1) {
        grams.add(text.slice(i, i + 3));
    }
    return grams;
}
function trigramScore(left, right) {
    const leftTri = trigrams(left);
    const rightTri = trigrams(right);
    if (leftTri.size === 0 || rightTri.size === 0) {
        return 0;
    }
    let common = 0;
    leftTri.forEach((token) => {
        if (rightTri.has(token)) {
            common += 1;
        }
    });
    const union = new Set([...leftTri, ...rightTri]).size;
    return common / union;
}
function buildAliasIndex(apis, aliases) {
    return apis.map((api) => {
        const curated = aliases.aliases
            .filter((entry) => entry.apiId === api.apiId)
            .flatMap((entry) => entry.phrases || []);
        const generated = [
            api.apiId.replace(/[._]/g, " "),
            api.path.replace(/[/-]/g, " "),
            api.title || "",
            api.operationId || ""
        ]
            .map((value) => normalizeText(value))
            .filter(Boolean);
        return {
            apiId: api.apiId,
            phrases: [...new Set([...generated, ...curated.map((value) => normalizeText(value))])],
            curatedPhrases: curated.map((value) => normalizeText(value))
        };
    });
}
function hasDependencyPrior(dependencyGraph, previousApiId, nextApiId) {
    if (!previousApiId) {
        return false;
    }
    return dependencyGraph.edges.some((edge) => edge.from === previousApiId && edge.to === nextApiId);
}
export function topologicalSortSubset(apiIds, dependencyGraph) {
    const uniqueApiIds = [...new Set(apiIds)];
    const apiIdSet = new Set(uniqueApiIds);
    const edges = dependencyGraph.edges.filter((edge) => apiIdSet.has(edge.from) && apiIdSet.has(edge.to));
    const indegree = new Map(uniqueApiIds.map((id) => [id, 0]));
    const outgoing = new Map();
    edges.forEach((edge) => {
        indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
        const list = outgoing.get(edge.from) || [];
        list.push(edge.to);
        outgoing.set(edge.from, list);
    });
    const queue = uniqueApiIds.filter((id) => (indegree.get(id) || 0) === 0);
    const output = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }
        output.push(current);
        (outgoing.get(current) || []).forEach((to) => {
            const nextDegree = (indegree.get(to) || 0) - 1;
            indegree.set(to, nextDegree);
            if (nextDegree === 0) {
                queue.push(to);
            }
        });
    }
    const remaining = uniqueApiIds.filter((id) => !output.includes(id));
    return [...output, ...remaining];
}
function resolveExplicitApiRefs(refs, apis) {
    if (refs.length === 0) {
        return null;
    }
    const apiIds = [];
    for (const ref of refs) {
        if (ref.apiId) {
            const exact = apis.find((api) => api.apiId === ref.apiId);
            if (!exact) {
                return null;
            }
            apiIds.push(exact.apiId);
            continue;
        }
        const method = ref.method?.toUpperCase();
        const pathHint = ref.pathHint ? stripQuery(ref.pathHint) : "";
        const nameHint = ref.apiNameHint ? normalizeText(ref.apiNameHint) : "";
        const candidates = apis.filter((api) => {
            const methodMatch = method ? api.method.toUpperCase() === method : true;
            const pathMatch = pathHint
                ? pathsMatch(pathHint, api.path) ||
                    normalizeText(api.path).includes(normalizeText(pathHint)) ||
                    normalizeText(pathHint).includes(normalizeText(api.path))
                : true;
            const nameMatch = nameHint
                ? normalizeText(api.apiId).includes(nameHint.replace(/\s+/g, "_")) ||
                    normalizeText(api.title || "").includes(nameHint)
                : true;
            return methodMatch && pathMatch && nameMatch;
        });
        if (candidates.length !== 1) {
            return null;
        }
        apiIds.push(candidates[0].apiId);
    }
    return {
        apiIds,
        confidence: 1,
        matchMethod: refs.some((ref) => ref.apiId) ? "apiRef:apiId" : "apiRef:method+path"
    };
}
function matchApi(stepText, apiHints, aliasIndex, dependencyGraph, previousApiId) {
    const normalizedStep = normalizeText(stepText);
    let bestMatch = null;
    aliasIndex.forEach((alias) => {
        const exactAlias = alias.phrases.some((phrase) => normalizedStep.includes(phrase));
        const curatedAlias = alias.curatedPhrases.some((phrase) => normalizedStep.includes(phrase));
        const token = Math.max(...alias.phrases.map((phrase) => jaccardScore(normalizedStep, phrase)), 0);
        const trigram = Math.max(...alias.phrases.map((phrase) => trigramScore(normalizedStep, phrase)), 0);
        const sequencePrior = hasDependencyPrior(dependencyGraph, previousApiId, alias.apiId) ? 1 : 0;
        let hintBoost = 0;
        if (apiHints?.apiNameHint && alias.apiId.includes(normalizeText(apiHints.apiNameHint).replace(/\s+/g, "_"))) {
            hintBoost += 0.5;
        }
        if (apiHints?.pathHint && normalizeText(apiHints.pathHint).includes(alias.apiId.split(".")[1] || "")) {
            hintBoost += 0.35;
        }
        if (apiHints?.method && apiHints.method.length > 0) {
            hintBoost += 0.1;
        }
        const confidence = exactAlias
            ? 1
            : Math.min(1, (curatedAlias ? 0.4 : 0) + token * 0.35 + trigram * 0.25 + sequencePrior * 0.3 + hintBoost);
        if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
                apiId: alias.apiId,
                confidence,
                matchMethod: exactAlias ? "exact-alias" : curatedAlias ? "curated+similarity" : "similarity"
            };
        }
    });
    return bestMatch;
}
function matchComposite(stepText, aliases) {
    const normalizedStep = normalizeText(stepText);
    for (const alias of aliases.aliases) {
        if (!alias.composite || !alias.apiIds || alias.apiIds.length === 0) {
            continue;
        }
        if (normalizedStep.includes(normalizeText(alias.composite))) {
            return {
                apiIds: alias.apiIds,
                key: alias.composite
            };
        }
    }
    return null;
}
function buildJourneyId(productId, testCase, journeyTag) {
    return `${productId}_${testCase.persona}_${journeyTag}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
export function step2mLinkJourney(input) {
    const mappingThreshold = input.mappingThreshold ?? 0.95;
    const strictMapping = input.strictMapping ?? true;
    const aliasConfig = input.aliases || {
        productId: input.productId,
        aliases: []
    };
    const aliasIndex = buildAliasIndex(input.apiContracts.apis, aliasConfig);
    let totalSteps = 0;
    let mappedSteps = 0;
    const unmapped = [];
    const journeys = [];
    input.manualCases.cases.forEach((testCase) => {
        const stepMappings = [];
        const selectedApiIds = [];
        let previousApiId;
        testCase.steps.forEach((stepText, index) => {
            const stepType = testCase.stepTypes?.[index] || "ui";
            const explicitRefs = testCase.stepApiRefGroups?.[index]?.filter((ref) => !!ref && Object.keys(ref).length > 0) || [];
            if (stepType === "ui" && explicitRefs.length === 0) {
                return;
            }
            totalSteps += 1;
            if (explicitRefs.length > 0) {
                const explicit = resolveExplicitApiRefs(explicitRefs, input.apiContracts.apis);
                if (explicit) {
                    mappedSteps += 1;
                    stepMappings.push({
                        caseId: testCase.caseId,
                        manualStepIndex: index + 1,
                        manualText: stepText,
                        apiIds: explicit.apiIds,
                        confidence: explicit.confidence,
                        matchMethod: explicit.matchMethod
                    });
                    selectedApiIds.push(...explicit.apiIds);
                    previousApiId = explicit.apiIds[explicit.apiIds.length - 1];
                    return;
                }
                unmapped.push({
                    caseId: testCase.caseId,
                    manualStepIndex: index + 1,
                    manualText: stepText
                });
                return;
            }
            const composite = matchComposite(stepText, aliasConfig);
            if (composite) {
                mappedSteps += 1;
                stepMappings.push({
                    caseId: testCase.caseId,
                    manualStepIndex: index + 1,
                    manualText: stepText,
                    apiIds: composite.apiIds,
                    confidence: 0.98,
                    matchMethod: `composite:${composite.key}`
                });
                selectedApiIds.push(...composite.apiIds);
                previousApiId = composite.apiIds[composite.apiIds.length - 1];
                return;
            }
            const apiHint = testCase.stepApiRefs?.[index];
            const bestMatch = matchApi(stepText, apiHint, aliasIndex, input.dependencyGraph, previousApiId);
            if (!bestMatch || bestMatch.confidence < 0.45) {
                unmapped.push({
                    caseId: testCase.caseId,
                    manualStepIndex: index + 1,
                    manualText: stepText
                });
                return;
            }
            mappedSteps += 1;
            stepMappings.push({
                caseId: testCase.caseId,
                manualStepIndex: index + 1,
                manualText: stepText,
                apiIds: [bestMatch.apiId],
                confidence: Number(bestMatch.confidence.toFixed(3)),
                matchMethod: bestMatch.matchMethod
            });
            selectedApiIds.push(bestMatch.apiId);
            previousApiId = bestMatch.apiId;
        });
        const tags = testCase.journeyTags.length > 0 ? testCase.journeyTags : ["default"];
        tags.forEach((journeyTag) => {
            const orderedApiIds = topologicalSortSubset(selectedApiIds, input.dependencyGraph);
            journeys.push({
                journeyId: buildJourneyId(input.productId, testCase, journeyTag),
                persona: testCase.persona,
                sourceCaseIds: [testCase.caseId],
                apiSequence: orderedApiIds,
                stepMappings,
                checkpoints: orderedApiIds.length > 0
                    ? [
                        {
                            afterApiId: orderedApiIds[orderedApiIds.length - 1],
                            caseId: testCase.caseId
                        }
                    ]
                    : []
            });
        });
    });
    const mappingRate = totalSteps === 0 ? 0 : Number((mappedSteps / totalSteps).toFixed(3));
    const targetMet = mappingRate >= mappingThreshold;
    if (strictMapping && !targetMet) {
        throw new Error(`Step 2m mapping gate failed: mappingRate=${mappingRate} threshold=${mappingThreshold}.`);
    }
    return {
        schemaVersion: "04-journey-spec-v1",
        productId: input.productId,
        manualTcHash: input.manualCases.manualTcHash,
        mappingMeta: {
            totalSteps,
            mappedSteps,
            mappingRate,
            targetMet
        },
        journeys,
        unmapped
    };
}
