import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ManualTestCaseInput } from "../../../src/contracts/pipeline.js";
import { step1bManualTestCases } from "../../../src/pipelines/ingest/step-1b-manual-test-cases.js";
import { step2ApiContracts } from "../../../src/pipelines/ingest/step-2-api-contracts.js";
import { step2mLinkJourney } from "../../../src/pipelines/linker/step-2m-link-journey.js";

const fixturesDir = path.resolve("tests/fixtures/p0");

async function readJson<T>(fileName: string): Promise<T> {
  const content = await readFile(path.join(fixturesDir, fileName), "utf8");
  return JSON.parse(content) as T;
}

describe("P0 ingest + linker pipeline", () => {
  it("produces stable 04 journey spec with mappingRate >= 0.95", async () => {
    const manualInput = await readJson<{ cases: ManualTestCaseInput[] }>("manual-test-cases.json");
    const postmanInput = await readJson<{ item: unknown[] }>("postman-collection.json");
    const openApiInput = await readJson<Record<string, unknown>>("openapi.json");
    const manualCases = step1bManualTestCases({
      productId: "bbps/ccbp",
      rawCases: manualInput
    });
    const ingestOut = step2ApiContracts({
      productId: "bbps/ccbp",
      postmanCollection: postmanInput,
      openApiSpec: openApiInput
    });
    const journeySpec = step2mLinkJourney({
      productId: "bbps/ccbp",
      manualCases,
      apiContracts: ingestOut.apiContracts,
      dependencyGraph: ingestOut.dependencyGraph,
      mappingThreshold: 1,
      strictMapping: true
    });

    expect(ingestOut.apiContracts.apis.length).toBe(4);
    expect(ingestOut.schemaIndex.unresolvedRefs).toHaveLength(0);
    expect(journeySpec.mappingMeta.mappingRate).toBeGreaterThanOrEqual(0.95);
    expect(journeySpec.unmapped).toHaveLength(0);
    expect(journeySpec.journeys[0]?.apiSequence).toEqual([
      "auth.send_otp",
      "auth.verify_otp",
      "ccbp.bill_fetch",
      "ccbp.bills"
    ]);
  });
});
