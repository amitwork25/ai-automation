import type {
  ApprovalManifestArtifact,
  AssertionCompileReportArtifact,
  BusinessRulesArtifact,
  CustomAssertCompileReportArtifact,
  JourneySpecArtifact
} from "../../contracts/pipeline.js";

export function step18ApprovalManifest(input: {
  runId: string;
  productId: string;
  businessRules: BusinessRulesArtifact;
  assertionReport: AssertionCompileReportArtifact;
  customAssertReport?: CustomAssertCompileReportArtifact;
  journeySpec: JourneySpecArtifact;
}): ApprovalManifestArtifact {
  const pendingRuleIds = input.businessRules.unmappedRules.map((entry) => `${entry.caseId}:${entry.manualStepIndex ?? "x"}`);
  const pendingCustomAssertIds = [
    ...input.assertionReport.pendingCustom,
    ...(input.customAssertReport?.pendingLlm ?? [])
  ];

  const approvalStatus =
    pendingRuleIds.length === 0 && pendingCustomAssertIds.length === 0 && input.journeySpec.unmapped.length === 0
      ? "none_required"
      : "pending";

  return {
    schemaVersion: "18-approval-manifest-v1",
    productId: input.productId,
    runId: input.runId,
    pendingRuleIds,
    pendingCustomAssertIds: [...new Set(pendingCustomAssertIds)],
    unmappedManualSteps: input.journeySpec.unmapped,
    approvalStatus
  };
}
