import path from "node:path";

import type {
  AssertionCatalog,
  AssertionCompileReportArtifact,
  BusinessRulesMappedArtifact,
  JourneyPlanArtifact,
  RepoIndexArtifact
} from "../../contracts/pipeline.js";
import { loadAssertionCatalog } from "../rules/load-rule-knowledge.js";
import { writeTextFile } from "./file-writer.js";
import { assertFunctionName, contextTypeName, personaFolder, renderAssertionsFile } from "./render-integration-files.js";

export async function step11AssertionCompile(input: {
  productId: string;
  codegenRoot: string;
  mappedRules: BusinessRulesMappedArtifact;
  journeyPlan: JourneyPlanArtifact;
  repoIndex: RepoIndexArtifact;
  assertionCatalog?: AssertionCatalog;
}): Promise<AssertionCompileReportArtifact> {
  const catalog = input.assertionCatalog ?? (await loadAssertionCatalog());
  const generated: AssertionCompileReportArtifact["generated"] = [];
  const skipped: AssertionCompileReportArtifact["skipped"] = [];
  const errors: AssertionCompileReportArtifact["errors"] = [];
  const pendingCustom = new Set<string>();
  let templateCount = 0;
  let compiledLines = 0;

  for (const journey of input.journeyPlan.journeys) {
    try {
      const persona = personaFolder(journey.persona);
      const outputPath = path.join(
        "tests/integration",
        ...input.productId.split("/"),
        persona,
        "assertions.generated.ts"
      );
      const fnName = assertFunctionName(journey.journeyId, true);
      const ctxType = contextTypeName(journey.journeyId);

      const rendered = renderAssertionsFile({
        functionName: fnName,
        contextTypeName: ctxType,
        mappedRules: input.mappedRules,
        catalog
      });

      templateCount += input.mappedRules.mappings.filter((entry) => entry.status === "template").length;
      compiledLines += rendered.compiledLines;
      rendered.pendingCustom.forEach((ruleId) => pendingCustom.add(ruleId));

      const write = await writeTextFile({
        outputRoot: input.codegenRoot,
        relativePath: outputPath,
        content: rendered.content,
        overwrite: true
      });

      generated.push({ apiId: journey.journeyId, files: [write.relativePath] });
    } catch (error) {
      errors.push({
        apiId: journey.journeyId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    schemaVersion: "11-assertion-compile-report-v1",
    productId: input.productId,
    repoRoot: input.codegenRoot,
    generated,
    skipped,
    pendingCustom: [...pendingCustom],
    errors,
    summary: {
      templateCount,
      compiledLines,
      generatedCount: generated.length,
      skippedCount: skipped.length
    }
  };
}
