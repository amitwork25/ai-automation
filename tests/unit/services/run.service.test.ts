import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileArtifactStore } from "../../../src/infrastructure/artifact-store/fileArtifactStore.js";
import type { ManualTestCaseInput } from "../../../src/contracts/pipeline.js";
import type { IFrameworkIntelligenceService } from "../../../src/ports/IFrameworkIntelligenceService.js";
import { RunService } from "../../../src/services/runs/run.service.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

function mockFrameworkService(ready: boolean): IFrameworkIntelligenceService {
  const workspaceDir = path.resolve("workspace/framework");
  return {
    async initOnStartup() {
      return Promise.resolve();
    },
    async runRefresh() {
      return {
        action: "pull",
        branch: "main",
        commitSha: "1234abcd",
        workspaceDir,
        syncedAt: new Date().toISOString(),
        success: true
      };
    },
    async getStatus() {
      return {
        ready,
        branch: "main",
        workspaceDir
      };
    }
  };
}

describe("RunService", () => {
  /** Isolated unit-test payload — real runs should use inputs/bbps-ccbp/run-payload.json (TC-39). */
  const manualCases: ManualTestCaseInput[] = [
    {
      caseId: "UNIT-SMOKE-001",
      title: "Smoke API coverage",
      persona: "new_user",
      journeyTags: ["smoke"],
      steps: [
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
  it("rejects run creation when framework is not ready", async () => {
    const testDir = await mkdtemp(path.join(os.tmpdir(), "run-service-not-ready-"));
    tempDirs.push(testDir);

    const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));
    const service = new RunService(mockFrameworkService(false), artifactStore);

    await expect(
      service.createRun({
        productId: "bbps/ccbp",
        manualTestCases: manualCases,
        postmanCollection
      })
    ).rejects.toThrow("Framework workspace is not ready");
  });

  it("creates run and executes graph when framework is ready", async () => {
    const testDir = await mkdtemp(path.join(os.tmpdir(), "run-service-ready-"));
    tempDirs.push(testDir);

    const artifactStore = new FileArtifactStore(path.join(testDir, "runs"));
    const service = new RunService(mockFrameworkService(true), artifactStore);
    const result = await service.createRun({
      productId: "bbps/ccbp",
      manualTestCases: manualCases,
      postmanCollection
    });

    expect(result.status).toBe("completed");
    expect(result.repoRoot).toBe(path.resolve("workspace/framework"));
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
    expect(result.artifacts["18-approval-manifest.json"]).toBeDefined();
  });
});
