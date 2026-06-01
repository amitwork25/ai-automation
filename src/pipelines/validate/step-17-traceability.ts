import type {
  BusinessRulesArtifact,
  BusinessRulesMappedArtifact,
  JourneyPlanArtifact,
  JourneySpecArtifact,
  ManualTestCasesArtifact,
  TraceabilityArtifact,
  TraceabilityRow
} from "../../contracts/pipeline.js";

function mappingAssertFn(mapping: BusinessRulesMappedArtifact["mappings"][number]): string {
  if (mapping.assertFn) {
    return mapping.assertFn;
  }
  if (mapping.templateId) {
    return mapping.templateId;
  }
  return mapping.status;
}

export function step17Traceability(input: {
  runId: string;
  productId: string;
  manualCases: ManualTestCasesArtifact;
  businessRules: BusinessRulesArtifact;
  mappedRules: BusinessRulesMappedArtifact;
  journeySpec: JourneySpecArtifact;
  journeyPlan: JourneyPlanArtifact;
}): { artifact: TraceabilityArtifact; markdown: string } {
  const mappingByRuleId = new Map(input.mappedRules.mappings.map((entry) => [entry.ruleId, entry]));
  const rows: TraceabilityRow[] = [];

  for (const rule of input.businessRules.rules) {
    const mapping = mappingByRuleId.get(rule.ruleId);
    const journey = input.journeySpec.journeys.find((entry) => entry.sourceCaseIds.includes(rule.caseId));
    const apiId = rule.apiIds?.[0] || journey?.apiSequence[0] || "n/a";
    const planStep = input.journeyPlan.journeys
      .flatMap((entry) => entry.steps)
      .find((step) => step.apiIds?.some((id) => rule.apiIds?.includes(id)));

    rows.push({
      manualCaseId: rule.caseId,
      ruleId: rule.ruleId,
      assertFn: mapping ? mappingAssertFn(mapping) : "unmapped",
      specStep: planStep ? `order-${planStep.order}` : `step-${rule.manualStepIndex ?? "n/a"}`,
      apiId
    });
  }

  const header = "| Manual TC | Rule ID | Assert fn | Spec step | API |\n|-----------|---------|-----------|-----------|-----|";
  const body = rows
    .map(
      (row) =>
        `| ${row.manualCaseId} | ${row.ruleId} | ${row.assertFn} | ${row.specStep} | ${row.apiId} |`
    )
    .join("\n");

  const markdown = `# Traceability — ${input.productId}\n\nRun: \`${input.runId}\`\n\n${header}\n${body}\n`;

  return {
    artifact: {
      schemaVersion: "17-traceability-v1",
      productId: input.productId,
      runId: input.runId,
      rows
    },
    markdown
  };
}
