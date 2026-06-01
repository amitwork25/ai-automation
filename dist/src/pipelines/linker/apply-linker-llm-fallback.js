import { topologicalSortSubset } from "./step-2m-link-journey.js";
const MIN_CONFIDENCE = 0.7;
export function applyLinkerLlmFallback(input) {
    const accepted = input.mappings.filter((entry) => entry.apiIds.length > 0 && entry.confidence >= MIN_CONFIDENCE);
    if (accepted.length === 0) {
        return input.journeySpec;
    }
    const acceptedKeys = new Set(accepted.map((entry) => `${entry.caseId}:${entry.manualStepIndex}`));
    const unmapped = input.journeySpec.unmapped.filter((entry) => !acceptedKeys.has(`${entry.caseId}:${entry.manualStepIndex}`));
    const journeys = input.journeySpec.journeys.map((journey) => {
        const caseMappings = accepted.filter((entry) => journey.sourceCaseIds.includes(entry.caseId));
        if (caseMappings.length === 0) {
            return journey;
        }
        const stepMappings = [...journey.stepMappings];
        const newApiIds = [];
        for (const mapping of caseMappings) {
            stepMappings.push({
                caseId: mapping.caseId,
                manualStepIndex: mapping.manualStepIndex,
                manualText: mapping.manualText,
                apiIds: mapping.apiIds,
                confidence: Number(mapping.confidence.toFixed(3)),
                matchMethod: mapping.matchMethod || "llm:fallback"
            });
            newApiIds.push(...mapping.apiIds);
        }
        const apiSequence = topologicalSortSubset([...journey.apiSequence, ...newApiIds], input.dependencyGraph);
        return {
            ...journey,
            apiSequence,
            stepMappings,
            checkpoints: apiSequence.length > 0
                ? [
                    {
                        afterApiId: apiSequence[apiSequence.length - 1],
                        caseId: journey.sourceCaseIds[0]
                    }
                ]
                : journey.checkpoints
        };
    });
    const mappedSteps = input.journeySpec.mappingMeta.mappedSteps + accepted.length;
    const totalSteps = input.journeySpec.mappingMeta.totalSteps;
    const mappingThreshold = input.mappingThreshold ?? 0.95;
    const mappingRate = totalSteps === 0 ? 0 : Number((mappedSteps / totalSteps).toFixed(3));
    return {
        ...input.journeySpec,
        journeys,
        unmapped,
        mappingMeta: {
            totalSteps,
            mappedSteps,
            mappingRate,
            targetMet: mappingRate >= mappingThreshold
        }
    };
}
