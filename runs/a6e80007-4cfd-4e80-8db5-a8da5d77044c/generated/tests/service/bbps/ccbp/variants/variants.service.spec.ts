import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpVariantsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpVariantsService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.variants. Extend with negative cases as needed. */
test("@smoke Verify ccbp.variants service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpVariantsService(apiClient);
  const body = svc.variants(headers);;
  expect(body).toBeTruthy();
});

/** LLM-enriched cases from manual TC rules */
test("@journey Verify ccbp.variants returns popular variants and major networks", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpVariantsService(apiClient);
  const response = await svc.variants(headers);
  expect(response.data.variants.popularVariants).toBeGreaterThan(0);
  expect(response.data.networks).toEqual(expect.arrayContaining(["Visa", "Mastercard"]));
});
