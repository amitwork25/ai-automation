export type AutomationCodegenMode = "journey" | "api" | "both";

export function parseAutomationCodegenMode(value: unknown): AutomationCodegenMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "journey" || normalized === "api" || normalized === "both") {
    return normalized;
  }
  return "both";
}

export function includeApiLayer(mode: AutomationCodegenMode): boolean {
  return mode === "api" || mode === "both";
}

export function includeJourneyLayer(mode: AutomationCodegenMode): boolean {
  return mode === "journey" || mode === "both";
}
