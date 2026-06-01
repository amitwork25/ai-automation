import { createHash } from "node:crypto";

import type {
  AssertionHint,
  ManualStepApiRef,
  ManualTestCaseArtifact,
  ManualTestCaseInput,
  ManualTestCasesArtifact,
  ManualTestStepInput
} from "../../contracts/pipeline.js";

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "[]") {
    return [];
  }
  if (trimmed === "{}") {
    return {};
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (!Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseAssertionHint(expected: string): AssertionHint | null {
  const equals = expected.match(/^([\w.[\]]+)\s*=\s*(.+)$/i);
  if (equals) {
    return { path: equals[1], op: "equals", value: parseValue(equals[2]) };
  }

  const greater = expected.match(/^([\w.[\]]+)\s*>\s*(.+)$/i);
  if (greater) {
    return { path: greater[1], op: "gt", value: parseValue(greater[2]) };
  }

  const lower = expected.match(/^([\w.[\]]+)\s*<\s*(.+)$/i);
  if (lower) {
    return { path: lower[1], op: "lt", value: parseValue(lower[2]) };
  }

  const present = expected.match(/^([\w.[\]]+)\s+present$/i);
  if (present) {
    return { path: present[1], op: "present", value: true };
  }

  const length = expected.match(/^([\w.[\]]+)\s+length\s+(\d+)$/i);
  if (length) {
    return { path: length[1], op: "length", value: Number(length[2]) };
  }

  return null;
}

function readStepRefs(step: ManualTestStepInput): ManualStepApiRef[] {
  if (step.apiRefs && step.apiRefs.length > 0) {
    return step.apiRefs;
  }
  return step.apiRef ? [step.apiRef] : [];
}

function normalizeCase(rawCase: ManualTestCaseInput): ManualTestCaseArtifact {
  const stepApiRefs: Array<ManualStepApiRef | undefined> = [];
  const stepApiRefGroups: ManualStepApiRef[][] = [];
  const stepTypes: string[] = [];
  const steps = rawCase.steps.map((step) => {
    if (typeof step === "string") {
      stepApiRefs.push(undefined);
      stepApiRefGroups.push([]);
      stepTypes.push("ui");
      return step.trim();
    }

    const refs = readStepRefs(step);
    stepApiRefs.push(refs[0]);
    stepApiRefGroups.push(refs);
    stepTypes.push((step.stepType || (refs.length > 0 ? "api" : "ui")).toLowerCase());
    return step.action.trim();
  });

  const stepExpected = rawCase.steps.flatMap((step) =>
    typeof step === "string" ? [] : (step.expectedResults || []).map((line) => line.trim())
  );
  const expectedResults = [...(rawCase.expectedResults || []).map((line) => line.trim()), ...stepExpected];
  const assertionHints = expectedResults
    .map((line) => parseAssertionHint(line))
    .filter((hint): hint is AssertionHint => hint !== null);

  return {
    caseId: rawCase.caseId,
    title: rawCase.title,
    persona: rawCase.persona,
    journeyTags: rawCase.journeyTags,
    steps,
    expectedResults,
    assertionHints,
    stepApiRefs,
    stepApiRefGroups,
    stepTypes
  };
}

export function step1bManualTestCases(input: {
  productId: string;
  rawCases: ManualTestCaseInput[] | { cases: ManualTestCaseInput[] };
}): ManualTestCasesArtifact {
  const casesList = Array.isArray(input.rawCases) ? input.rawCases : input.rawCases.cases;
  const normalizedCases = casesList.map((rawCase) => normalizeCase(rawCase));
  const manualTcHash = `sha256:${createHash("sha256")
    .update(JSON.stringify(normalizedCases))
    .digest("hex")}`;

  return {
    productId: input.productId,
    manualTcHash,
    cases: normalizedCases
  };
}
