import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadAssertionCatalog } from "../../../src/pipelines/rules/load-rule-knowledge.js";
import { loadProductStepMap } from "../../../src/pipelines/knowledge/load-product-knowledge.js";
import { step7JourneyPlanner } from "../../../src/pipelines/planner/step-7-journey-planner.js";
import { step11AssertionCompile } from "../../../src/pipelines/codegen/step-11-assertion-compile.js";
import { step13JourneyCodegen } from "../../../src/pipelines/codegen/step-13-journey-codegen.js";

const tempDirs: string[] = [];
const fixturesDir = path.resolve("runs/p2-verify-1780144975400");

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function readFixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(fixturesDir, name), "utf8")) as T;
}

describe("P3 journey planner + integration codegen", () => {
  it("builds 07 journey plan with resolved step calls", async () => {
    const journeySpec = await readFixture("04-journey-spec.json");
    const dependencyGraph = await readFixture("02b-dependency-graph.json");
    const repoIndex = await readFixture("03-repo-index.json");
    const mappedRules = await readFixture("06-business-rules-mapped.json");
    const stepMap = await loadProductStepMap("bbps/ccbp");

    const plan = step7JourneyPlanner({
      productId: "bbps/ccbp",
      journeySpec,
      dependencyGraph,
      repoIndex,
      mappedRules,
      stepMap
    });

    expect(plan.schemaVersion).toBe("07-journey-plan-v1");
    expect(plan.journeys[0]?.steps.some((step) => step.call === "providerDetailsStep")).toBe(true);
    expect(plan.journeys[0]?.steps.some((step) => step.checkpoint?.includes("assertCcbpNewUserJourneyContracts"))).toBe(
      true
    );
    expect(plan.planMeta.resolvedCalls).toBeGreaterThan(0);
  });

  it("compiles template rules into assertions.generated.ts when hand-written file exists", async () => {
    const codegenRoot = await mkdtemp(path.join(os.tmpdir(), "p3-assertions-"));
    tempDirs.push(codegenRoot);

    const stepMap = await loadProductStepMap("bbps/ccbp");

    const journeyPlan = step7JourneyPlanner({
      productId: "bbps/ccbp",
      journeySpec: await readFixture("04-journey-spec.json"),
      dependencyGraph: await readFixture("02b-dependency-graph.json"),
      repoIndex: await readFixture("03-repo-index.json"),
      mappedRules: await readFixture("06-business-rules-mapped.json"),
      stepMap
    });

    const report = await step11AssertionCompile({
      productId: "bbps/ccbp",
      codegenRoot,
      mappedRules: await readFixture("06-business-rules-mapped.json"),
      journeyPlan,
      repoIndex: await readFixture("03-repo-index.json"),
      assertionCatalog: await loadAssertionCatalog()
    });

    expect(report.summary.compiledLines).toBeGreaterThan(0);
    expect(report.generated[0]?.files[0]).toContain("assertions.generated.ts");
  });

  it("generates journey.generated.ts and spec in greenfield temp repo", async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), "p3-greenfield-"));
    tempDirs.push(repoRoot);

    const repoIndex = {
      schemaVersion: "03-repo-index-v1" as const,
      productId: "bbps/ccbp",
      repoRoot,
      services: [],
      steps: (await readFixture<{ steps: { name: string }[] }>("03-repo-index.json")).steps,
      journeys: [],
      assertions: [],
      specs: [],
      folderLayout: {},
      referencePatterns: []
    };

    const stepMap = await loadProductStepMap("bbps/ccbp");

    const journeyPlan = step7JourneyPlanner({
      productId: "bbps/ccbp",
      journeySpec: await readFixture("04-journey-spec.json"),
      dependencyGraph: await readFixture("02b-dependency-graph.json"),
      repoIndex,
      mappedRules: await readFixture("06-business-rules-mapped.json"),
      stepMap
    });

    const report = await step13JourneyCodegen({
      productId: "bbps/ccbp",
      codegenRoot: repoRoot,
      journeyPlan,
      repoIndex,
      stepMap
    });

    expect(report.summary.generatedCount).toBe(1);
    expect(report.generated[0]?.files.some((file) => file.endsWith("journey.generated.ts"))).toBe(true);
    expect(report.generated[0]?.files.some((file) => file.includes("generated.spec.ts"))).toBe(true);
  });
});
