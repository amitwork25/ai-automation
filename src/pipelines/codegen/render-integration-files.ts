import type { AssertionCatalog, BusinessRulesMappedArtifact, RuleMapping, RepoIndexArtifact } from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import {
  depthToRepoRoot,
  findTestDataGetter,
  relativeImportToSharedSteps
} from "../knowledge/load-product-knowledge.js";

function labelFromPath(contextPath: string): string {
  return contextPath.split(".").pop() || contextPath;
}

function renderTemplateLine(mapping: RuleMapping, catalog: AssertionCatalog): string | null {
  if (mapping.status !== "template" || !mapping.templateId) {
    return null;
  }

  const template = catalog.templates.find((entry) => entry.templateId === mapping.templateId);
  if (!template) {
    return null;
  }

  if (mapping.assertFn && template.match.assertFn) {
    return `  ${mapping.assertFn}(ctx);`;
  }

  const contextPath = mapping.contextPath ? `ctx.${mapping.contextPath}` : "ctx";
  const label = labelFromPath(mapping.contextPath || "field");
  let line = template.emit
    .replaceAll("{{contextPath}}", contextPath)
    .replaceAll("{{label}}", JSON.stringify(label))
    .replaceAll("{{expected}}", JSON.stringify(mapping.expected ?? null));

  if (!line.trim().startsWith("expect") && !line.trim().startsWith("assert")) {
    line = `  ${line}`;
  } else if (!line.startsWith("  ")) {
    line = `  ${line}`;
  }

  return line.endsWith(";") ? line : `${line};`;
}

export function renderAssertionsFile(input: {
  functionName: string;
  contextTypeName: string;
  mappedRules: BusinessRulesMappedArtifact;
  catalog: AssertionCatalog;
}): { content: string; compiledLines: number; pendingCustom: string[] } {
  const lines: string[] = [];
  const seen = new Set<string>();
  const pendingCustom: string[] = [];

  for (const mapping of input.mappedRules.mappings) {
    if (mapping.status === "custom") {
      pendingCustom.push(mapping.ruleId);
      continue;
    }
    if (mapping.status === "non_automatable") {
      continue;
    }

    const rendered = renderTemplateLine(mapping, input.catalog);
    if (!rendered || seen.has(rendered)) {
      continue;
    }
    seen.add(rendered);
    lines.push(rendered);
  }

  const content = `import { expect } from "@playwright/test";

/** Generated assertion checkpoint compiled from 06-business-rules-mapped.json */
export function ${input.functionName}(ctx: ${input.contextTypeName}): void {
${lines.length > 0 ? lines.join("\n") : "  expect(ctx).toBeTruthy();"}
}
`;

  return { content, compiledLines: lines.length, pendingCustom };
}

export function personaFolder(persona: string): string {
  return persona.replace(/_/g, "-");
}

export function contextTypeName(journeyId: string): string {
  const slug = journeyId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${slug}Context`;
}

export function assertFunctionName(journeyId: string, generated = false): string {
  const base = contextTypeName(journeyId).replace(/Context$/, "");
  return generated ? `assert${base}GeneratedContracts` : `assert${base}Contracts`;
}

export function runFunctionName(journeyId: string, generated = false): string {
  const base = runFunctionNameFromId(journeyId);
  return generated ? `${base}Generated` : base;
}

function runFunctionNameFromId(journeyId: string): string {
  const slug = journeyId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  return `run${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

export function renderTypesFile(contextTypeNameValue: string, contextFields: string[]): string {
  const fields = contextFields
    .map((field) => `  ${field}: unknown;`)
    .join("\n");

  return `/** Generated journey context for integration assertions. Refine types from models when stable. */
export interface ${contextTypeNameValue} {
  authToken: string;
  utilityId?: number;
${fields ? `${fields}\n` : ""}}
`;
}

export function renderJourneyFile(input: {
  runFunctionName: string;
  contextTypeName: string;
  importSteps: string[];
  planBodyLines: string[];
  typesImportPath?: string;
  repoIndex: RepoIndexArtifact;
  journeyFilePath: string;
  testDataGetter?: string;
}): string {
  const typesImport = input.typesImportPath ?? "./types";
  const testDataGetter = input.testDataGetter ?? findTestDataGetter(input.repoIndex) ?? "getTestData";
  const sharedStepsPath = input.repoIndex.folderLayout.sharedSteps ?? "tests/integration/shared/steps.ts";
  const sharedImport = relativeImportToSharedSteps(input.journeyFilePath, sharedStepsPath);
  const coreDepth = depthToRepoRoot(input.journeyFilePath);

  const stepImports = [
    ...new Set(input.importSteps.filter((name) => name !== testDataGetter))
  ];
  const stepsImportBlock =
    stepImports.length > 0
      ? `import {\n  ${testDataGetter},\n  ${stepImports.join(",\n  ")}\n} from "${sharedImport}";`
      : `import { ${testDataGetter} } from "${sharedImport}";`;

  return `import type { ApiClient } from "${coreDepth}src/core/api/ApiClient";
${stepsImportBlock}
import type { ${input.contextTypeName} } from "${typesImport}";

/** Generated from 07-journey-plan.json */
export async function ${input.runFunctionName}(apiClient: ApiClient): Promise<${input.contextTypeName}> {
  const input = ${testDataGetter}();
  const ctx: ${input.contextTypeName} = { authToken: "" };

${input.planBodyLines.join("\n")}

  return ctx;
}
`;
}

export function renderJourneySpecFile(input: {
  caseIds: string[];
  runFunctionName: string;
  assertFunctionName: string;
  generated: boolean;
  /** e.g. "new-user" when spec sits beside the persona folder */
  personaDir?: string;
  /** Relative path from framework/codegen root, used to compute import depth */
  specRelativePath?: string;
}): string {
  const depthSegments = (input.specRelativePath ?? "tests/integration/spec.ts").split("/").length - 1;
  const depth = "../".repeat(depthSegments);
  const modulePrefix = input.personaDir ? `./${input.personaDir}/` : "./";
  const assertionsModule = input.generated ? `${modulePrefix}assertions.generated` : `${modulePrefix}assertions`;
  const journeyModule = input.generated ? `${modulePrefix}journey.generated` : `${modulePrefix}journey`;

  return `import { test } from "${depth}src/fixtures/infrastructure.fixture";
import { ${input.assertFunctionName} } from "${assertionsModule}";
import { ${input.runFunctionName} } from "${journeyModule}";

/** Generated integration spec for ${input.caseIds.join(", ")} */
test("@smoke ${input.caseIds.join(", ")} generated journey checkpoint", async ({ apiClient }) => {
  const ctx = await ${input.runFunctionName}(apiClient);
  ${input.assertFunctionName}(ctx);
});
`;
}

export function buildPlanBodyLines(
  planSteps: Array<{ calls?: string[]; call?: string }>,
  stepMap: ProductStepMapConfig
): {
  lines: string[];
  importSteps: Set<string>;
  contextFields: Set<string>;
} {
  const importSteps = new Set<string>();
  const contextFields = new Set<string>();
  const lines: string[] = [];
  const emitted = new Set<string>();
  const entrySteps = new Set(stepMap.journeyEntrySteps);

  for (const step of planSteps) {
    const calls = step.calls || (step.call ? [step.call] : []);
    for (const call of calls) {
      if (emitted.has(call)) {
        continue;
      }

      const bodyLines = stepMap.stepBodyLines?.[call];
      if (bodyLines && bodyLines.length > 0) {
        if (entrySteps.has(call)) {
          const entryBlock = stepMap.journeyEntrySteps
            .flatMap((entryCall) => stepMap.stepBodyLines?.[entryCall] ?? [])
            .join("\n");
          if (entryBlock && !emitted.has("__entry__")) {
            for (const entryCall of stepMap.journeyEntrySteps) {
              importSteps.add(entryCall);
              emitted.add(entryCall);
            }
            lines.push(...entryBlock.split("\n").map((line) => (line.startsWith("  ") ? line : `  ${line}`)));
            emitted.add("__entry__");
          }
          continue;
        }

        importSteps.add(call);
        for (const line of bodyLines) {
          lines.push(line.startsWith("  ") ? line : `  ${line}`);
        }
        for (const field of Object.keys(stepMap.stepWrites?.[call] ?? {})) {
          contextFields.add(field);
        }
        if (bodyLines.some((line) => line.includes("utilityIdFromDashboardBlocks"))) {
          importSteps.add("utilityIdFromDashboardBlocks");
        }
        emitted.add(call);
        continue;
      }

      importSteps.add(call);
      lines.push(`  // TODO: wire ${call} (add stepBodyLines in agent-knowledge/${stepMap.productId}/api-step-map.json)`);
      emitted.add(call);
    }
  }

  return { lines, importSteps, contextFields };
}
