export function parseAutomationCodegenMode(value) {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (normalized === "journey" || normalized === "api" || normalized === "both") {
        return normalized;
    }
    return "both";
}
export function includeApiLayer(mode) {
    return mode === "api" || mode === "both";
}
export function includeJourneyLayer(mode) {
    return mode === "journey" || mode === "both";
}
