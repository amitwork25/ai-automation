export function step16Review(input) {
    const findings = [];
    if (input.validationReport.validationStatus === "fail") {
        findings.push({
            severity: "error",
            code: "validation-fail",
            message: "Step 15 validation failed",
            refs: input.validationReport.gapsRemaining
        });
    }
    if (input.approvalManifest.approvalStatus === "pending") {
        findings.push({
            severity: "warn",
            code: "approval-pending",
            message: `${input.approvalManifest.pendingCustomAssertIds.length} custom asserts and ${input.approvalManifest.unmappedManualSteps.length} unmapped steps need review`,
            refs: input.approvalManifest.pendingRuleIds
        });
    }
    if (input.approvalManifest.unmappedManualSteps.length > 0) {
        findings.push({
            severity: "warn",
            code: "linker-gaps",
            message: "Manual steps without API mapping remain in journey spec",
            refs: input.approvalManifest.unmappedManualSteps.map((step) => `${step.caseId}:${step.manualStepIndex}`)
        });
    }
    const reviewStatus = findings.some((entry) => entry.severity === "error") ? "fail" : findings.length > 0 ? "warn" : "pass";
    return {
        schemaVersion: "16-review-report-v1",
        productId: input.productId,
        runId: input.runId,
        reviewStatus,
        findings,
        summary: {
            errorCount: findings.filter((entry) => entry.severity === "error").length,
            warnCount: findings.filter((entry) => entry.severity === "warn").length
        }
    };
}
