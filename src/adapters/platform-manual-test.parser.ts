import type { ManualStepApiRef, ManualTestCaseInput, ManualTestStepInput } from "../contracts/pipeline.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Platform export often interleaves action + expected on consecutive lines inside `steps`.
 */
export function parseInterleavedStepLines(stepsText: string): ManualTestStepInput[] {
  const lines = splitLines(stepsText);
  if (lines.length === 0) {
    return [];
  }

  if (lines.length === 1 && lines[0].includes("→")) {
    return lines[0]
      .split("→")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((action) => ({ action }));
  }

  const steps: ManualTestStepInput[] = [];
  for (let index = 0; index < lines.length; index += 2) {
    const action = lines[index];
    const expected = lines[index + 1];
    if (!action) {
      continue;
    }
    steps.push({
      action,
      expectedResults: expected ? [expected] : []
    });
  }
  return steps;
}

function isNullEndpointToken(value: string): boolean {
  const token = value.trim().toLowerCase();
  return token === "" || token === "null" || token === "none" || token === "-";
}

function parseEndpointPart(part: string): ManualStepApiRef {
  const trimmed = part.trim();
  if (!trimmed) {
    return {};
  }

  // apiId form: ccbp.bill_fetch
  if (!trimmed.startsWith("/") && !trimmed.startsWith("http") && trimmed.includes(".") && !trimmed.includes(" ")) {
    return { apiId: trimmed };
  }

  // METHOD + path form: POST /bbps/v1/billDesk/bbps/bill-fetch
  const methodPath = trimmed.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)$/i);
  if (methodPath) {
    return {
      method: methodPath[1].toUpperCase(),
      pathHint: normalizeEndpointPath(methodPath[2])
    };
  }

  // Full URL or path form
  return { pathHint: normalizeEndpointPath(trimmed) };
}

function normalizeEndpointPath(value: string): string {
  const trimmed = value.trim();
  const withoutQuery = trimmed.split("?")[0];
  if (withoutQuery.startsWith("http://") || withoutQuery.startsWith("https://")) {
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return withoutQuery.replace(/^https?:\/\/[^/]+/i, "");
    }
  }
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

function parseEndpointToken(token: string): ManualStepApiRef[] {
  if (isNullEndpointToken(token)) {
    return [];
  }

  return token
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseEndpointPart(part));
}

/**
 * One endpoint entry per action step (not per interleaved expected line).
 * Supports string with \\r\\n lines, or JSON array.
 */
export function parseStepEndpoints(raw: unknown): ManualStepApiRef[][] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (entry === null || entry === undefined) {
        return [];
      }
      if (typeof entry === "string") {
        return parseEndpointToken(entry);
      }
      if (Array.isArray(entry)) {
        return entry
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((part) => parseEndpointPart(part));
      }
      return [];
    });
  }

  if (typeof raw === "string") {
    return splitLines(raw).map((line) => parseEndpointToken(line));
  }

  return [];
}

export function applyStepEndpoints(
  steps: ManualTestStepInput[],
  endpoints: ManualStepApiRef[][]
): ManualTestStepInput[] {
  return steps.map((step, index) => {
    const refs = endpoints[index] || [];
    if (refs.length === 0) {
      return { ...step, stepType: "ui" };
    }
    if (refs.length === 1) {
      return { ...step, stepType: "api", apiRef: refs[0] };
    }
    return { ...step, stepType: "api", apiRefs: refs };
  });
}

function inferPersona(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("new user")) {
    return "new_user";
  }
  if (lower.includes("existing user")) {
    return "existing_user";
  }
  return "default_user";
}

function inferJourneyTags(name: string, testId: number): string[] {
  const lower = name.toLowerCase();
  if (lower.includes("ccbp") && lower.includes("new user")) {
    return ["ccbp_new_user_journey"];
  }
  if (lower.includes("ccbp")) {
    return ["ccbp_journey"];
  }
  return [`tc_${testId}`];
}

export function isPlatformManualResponse(raw: UnknownRecord): boolean {
  if (!Array.isArray(raw.response) || raw.response.length === 0) {
    return false;
  }
  const first = raw.response[0];
  if (!isRecord(first)) {
    return false;
  }
  const hasPlatformFields =
    ("test_id" in first || "testId" in first) &&
    (typeof first.steps === "string" || typeof first.expected_result === "string");
  const hasEnvelope = raw.success === true || typeof raw.requestId === "string";
  return hasPlatformFields && hasEnvelope;
}

export function parsePlatformManualCase(raw: UnknownRecord, index: number): ManualTestCaseInput {
  const testId = Number(raw.test_id ?? raw.testId ?? index + 1);
  const name = asString(raw.name || raw.title, `Manual case ${testId}`);
  const stepsText = asString(raw.steps);
  const expectedText = asString(raw.expected_result || raw.expectedResult);

  let steps = parseInterleavedStepLines(stepsText);
  if (steps.length === 0 && expectedText) {
    steps = parseInterleavedStepLines(expectedText);
  }

  const endpointRaw = raw.endpoint ?? raw.endpoints ?? raw.api_endpoints;
  if (endpointRaw !== undefined) {
    const endpoints = parseStepEndpoints(endpointRaw);
    steps = applyStepEndpoints(steps, endpoints);
  }

  return {
    caseId: asString(raw.caseId, `TC-${testId}`),
    title: name,
    persona: asString(raw.persona, inferPersona(name)),
    journeyTags: Array.isArray(raw.tags) && raw.tags.length > 0
      ? (raw.tags as unknown[]).map((tag) => asString(tag)).filter(Boolean)
      : inferJourneyTags(name, testId),
    steps,
    expectedResults: []
  };
}

export function parsePlatformManualResponse(raw: UnknownRecord): ManualTestCaseInput[] {
  return (raw.response as unknown[])
    .filter(isRecord)
    .filter((entry) => entry.is_deleted !== true && entry.visible !== false)
    .map((entry, index) => parsePlatformManualCase(entry, index));
}
