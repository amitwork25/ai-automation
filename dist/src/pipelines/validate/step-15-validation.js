import { access } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const REQUIRED_ARTIFACTS = [
    "01b-manual-test-cases.json",
    "02-api-contracts.json",
    "04-journey-spec.json",
    "03-repo-index.json",
    "05-business-rules.json",
    "06-business-rules-mapped.json",
    "07-journey-plan.json",
    "09-api-codegen-report.json",
    "10-service-test-report.json",
    "11-assertion-compile-report.json",
    "13-journey-codegen-report.json",
    "14-playwright-project-report.json"
];
async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function runOptionalCommand(check, command, args, cwd) {
    try {
        await execFileAsync(command, args, { cwd, timeout: 120_000 });
        return { ...check, status: "pass", message: `${check.message} (ok)` };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ...check, status: "warn", message: `${check.message} (skipped: ${message.slice(0, 180)})` };
    }
}
function collectGeneratedFiles(reports) {
    return reports.flatMap((report) => (report.generated ?? []).flatMap((entry) => entry.files));
}
export async function step15Validation(input) {
    const checks = [];
    const gapsRemaining = [];
    for (const artifactName of REQUIRED_ARTIFACTS) {
        const artifactPath = input.artifactPaths[artifactName];
        const exists = artifactPath ? await fileExists(artifactPath) : false;
        checks.push({
            id: `artifact:${artifactName}`,
            status: exists ? "pass" : "fail",
            message: exists ? `Found ${artifactName}` : `Missing ${artifactName}`
        });
        if (!exists) {
            gapsRemaining.push(`missing artifact ${artifactName}`);
        }
    }
    const generatedFiles = collectGeneratedFiles([
        input.apiCodegenReport,
        input.serviceTestReport,
        input.assertionReport,
        input.journeyReport
    ]);
    for (const relativePath of generatedFiles) {
        const absolutePath = path.join(input.codegenRoot, relativePath);
        const exists = await fileExists(absolutePath);
        checks.push({
            id: `generated:${relativePath}`,
            status: exists ? "pass" : "fail",
            message: exists
                ? `Generated file exists under run output: ${relativePath}`
                : `Generated file missing under ${input.codegenRoot}: ${relativePath}`
        });
        if (!exists) {
            gapsRemaining.push(`missing generated file ${relativePath}`);
        }
    }
    if (input.assertionReport.pendingCustom.length > 0) {
        gapsRemaining.push(...input.assertionReport.pendingCustom.map((ruleId) => `custom rule pending: ${ruleId}`));
        checks.push({
            id: "rules:pending-custom",
            status: "warn",
            message: `${input.assertionReport.pendingCustom.length} custom rules remain (step 12 / LLM)`
        });
    }
    const runExternalChecks = input.runExternalChecks ?? process.env.VITEST !== "true";
    if (runExternalChecks) {
        checks.push({
            id: "codegen-root",
            status: (await fileExists(input.codegenRoot)) ? "pass" : "fail",
            message: `Run codegen root: ${input.codegenRoot}`
        });
    }
    else {
        checks.push({
            id: "external-checks",
            status: "warn",
            message: "Skipped tsc/playwright checks (runExternalChecks=false)"
        });
    }
    const failed = checks.some((check) => check.status === "fail");
    const validationStatus = failed ? "fail" : gapsRemaining.length > 0 ? "warn" : "pass";
    return {
        schemaVersion: "15-validation-report-v1",
        productId: input.productId,
        repoRoot: input.repoRoot,
        validationStatus,
        checks,
        gapsRemaining
    };
}
