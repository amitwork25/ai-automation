import path from "node:path";

import type { JourneyCodegenReportArtifact, JourneyPlanArtifact, RepoIndexArtifact } from "../../contracts/pipeline.js";
import type { ProductStepMapConfig } from "../knowledge/product-step-map.types.js";
import { findTestDataGetter } from "../knowledge/load-product-knowledge.js";
import { writeTextFile } from "./file-writer.js";
import {
  assertFunctionName,
  buildPlanBodyLines,
  contextTypeName,
  personaFolder,
  renderJourneyFile,
  renderJourneySpecFile,
  renderTypesFile,
  runFunctionName
} from "./render-integration-files.js";

function integrationBase(productId: string, persona: string): string {
  return path.join("tests/integration", ...productId.split("/"), personaFolder(persona));
}

export async function step13JourneyCodegen(input: {
  productId: string;
  codegenRoot: string;
  journeyPlan: JourneyPlanArtifact;
  repoIndex: RepoIndexArtifact;
  stepMap: ProductStepMapConfig;
}): Promise<JourneyCodegenReportArtifact> {
  const generated: JourneyCodegenReportArtifact["generated"] = [];
  const skipped: JourneyCodegenReportArtifact["skipped"] = [];
  const errors: JourneyCodegenReportArtifact["errors"] = [];

  for (const journey of input.journeyPlan.journeys) {
    try {
      const baseDir = integrationBase(input.productId, journey.persona);
      const outputJourneyPath = path.join(baseDir, "journey.generated.ts");
      const outputTypesPath = path.join(baseDir, "types.generated.ts");
      const specPath = path.join(
        "tests/integration",
        ...input.productId.split("/"),
        `${personaFolder(journey.persona)}-journey.generated.spec.ts`
      );

      const { lines, importSteps, contextFields } = buildPlanBodyLines(journey.steps, input.stepMap);
      const ctxType = contextTypeName(journey.journeyId);
      const runFn = runFunctionName(journey.journeyId, true);
      const assertFn = assertFunctionName(journey.journeyId, true);
      const personaDir = personaFolder(journey.persona);
      const testDataGetter = findTestDataGetter(input.repoIndex);

      const typesWrite = await writeTextFile({
        outputRoot: input.codegenRoot,
        relativePath: outputTypesPath,
        content: renderTypesFile(ctxType, [...contextFields]),
        overwrite: true
      });

      const journeyWrite = await writeTextFile({
        outputRoot: input.codegenRoot,
        relativePath: outputJourneyPath,
        content: renderJourneyFile({
          runFunctionName: runFn,
          contextTypeName: ctxType,
          importSteps: [...importSteps],
          planBodyLines: lines,
          typesImportPath: "./types.generated",
          repoIndex: input.repoIndex,
          journeyFilePath: outputJourneyPath,
          testDataGetter
        }),
        overwrite: true
      });

      const specWrite = await writeTextFile({
        outputRoot: input.codegenRoot,
        relativePath: specPath,
        content: renderJourneySpecFile({
          caseIds: journey.sourceCaseIds,
          runFunctionName: runFn,
          assertFunctionName: assertFn,
          generated: true,
          personaDir,
          specRelativePath: specPath
        }),
        overwrite: true
      });

      generated.push({
        apiId: journey.journeyId,
        files: [typesWrite.relativePath, journeyWrite.relativePath, specWrite.relativePath]
      });
    } catch (error) {
      errors.push({
        apiId: journey.journeyId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    schemaVersion: "13-journey-codegen-report-v1",
    productId: input.productId,
    repoRoot: input.codegenRoot,
    generated,
    skipped,
    errors,
    summary: {
      journeyCount: input.journeyPlan.journeys.length,
      generatedCount: generated.length,
      skippedCount: skipped.length,
      errorCount: errors.length
    }
  };
}
