import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileArtifactStore } from "../../../src/infrastructure/artifact-store/fileArtifactStore.js";
import { executeRunGraph } from "../../../src/orchestrator/graph.js";
import type { ManualTestCaseInput } from "../../../src/contracts/pipeline.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("run graph shell", () => {
  it("executes ingest and linker nodes end-to-end", async () => {
    const testDir = await mkdtemp(path.join(os.tmpdir(), "run-graph-"));
    tempDirs.push(testDir);

    const manualCases: ManualTestCaseInput[] = [
      {
        caseId: "MTC-1",
        title: "Login and fetch",
        persona: "new_user",
        journeyTags: ["bill_discovery"],
        steps: [
          {
            action: "Login with mobile",
            stepType: "api",
            apiRefs: [{ apiId: "auth.send_otp" }, { apiId: "auth.verify_otp" }]
          },
          {
            action: "Fetch bill",
            stepType: "api",
            apiRef: { apiId: "ccbp.bill_fetch" }
          }
        ],
        expectedResults: ["status=200"]
      }
    ];
    const postmanCollection = {
      item: [
        {
          name: "Send OTP",
          request: { method: "POST", url: { raw: "https://api.example.com/auth/send-otp" } }
        },
        {
          name: "Verify OTP",
          request: { method: "POST", url: { raw: "https://api.example.com/auth/verify-otp" } },
          dependsOn: [{ apiId: "auth.send_otp", via: "request_id" }]
        },
        {
          name: "Bill Fetch",
          request: { method: "POST", url: { raw: "https://api.example.com/bbps/v1/ccbp/bill-fetch" } },
          dependsOn: [{ apiId: "auth.verify_otp", via: "auth_token" }]
        }
      ]
    };
    const frameworkRoot = path.resolve("workspace/framework");
    const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));
    const result = await executeRunGraph(
      { artifactStore, runsDir: path.join(testDir, "runs") },
      {
        runId: "run-001",
        productId: "bbps/ccbp",
        repoRoot: frameworkRoot,
        codegenRoot: path.join(testDir, "runs", "run-001", "generated"),
        inputs: {
          manualTestCases: manualCases,
          postmanCollection,
          mappingThreshold: 0.95,
          strictMapping: true,
          mode: "greenfield"
        },
        artifacts: {},
        errors: [],
        status: "running"
      }
    );

    expect(result.status).toBe("completed");
    expect(result.artifacts["00-run-meta.json"]).toBeDefined();
    expect(result.artifacts["01b-manual-test-cases.json"]).toBeDefined();
    expect(result.artifacts["02-api-contracts.json"]).toBeDefined();
    expect(result.artifacts["04-journey-spec.json"]).toBeDefined();
    expect(result.artifacts["03-repo-index.json"]).toBeDefined();
    expect(result.artifacts["05-business-rules.json"]).toBeDefined();
    expect(result.artifacts["06-business-rules-mapped.json"]).toBeDefined();
    expect(result.artifacts["09-api-codegen-report.json"]).toBeDefined();
    expect(result.artifacts["10-service-test-report.json"]).toBeDefined();
    expect(result.artifacts["07-journey-plan.json"]).toBeDefined();
    expect(result.artifacts["11-assertion-compile-report.json"]).toBeDefined();
    expect(result.artifacts["13-journey-codegen-report.json"]).toBeDefined();
    expect(result.artifacts["15-validation-report.json"]).toBeDefined();
    expect(result.artifacts["17-traceability.json"]).toBeDefined();
    expect(result.artifacts["17-traceability.md"]).toBeDefined();
    expect(result.artifacts["14-playwright-project-report.json"]).toBeDefined();
    expect(result.artifacts["16-review-report.json"]).toBeDefined();
    expect(result.artifacts["18-approval-manifest.json"]).toBeDefined();
    expect(result.codegenRoot).toContain(path.join("runs", "run-001", "generated"));
    await access(result.artifacts["00-run-meta.json"]);
    await access(result.artifacts["01b-manual-test-cases.json"]);
    await access(result.artifacts["02-api-contracts.json"]);
    await access(result.artifacts["04-journey-spec.json"]);
    await access(result.artifacts["03-repo-index.json"]);
    await access(result.artifacts["05-business-rules.json"]);
    await access(result.artifacts["06-business-rules-mapped.json"]);
    await access(result.artifacts["09-api-codegen-report.json"]);
    await access(result.artifacts["10-service-test-report.json"]);
    await access(result.artifacts["07-journey-plan.json"]);
    await access(result.artifacts["11-assertion-compile-report.json"]);
    await access(result.artifacts["13-journey-codegen-report.json"]);
    await access(result.artifacts["15-validation-report.json"]);
    await access(result.artifacts["17-traceability.md"]);
    await access(result.artifacts["18-approval-manifest.json"]);
  });
});
