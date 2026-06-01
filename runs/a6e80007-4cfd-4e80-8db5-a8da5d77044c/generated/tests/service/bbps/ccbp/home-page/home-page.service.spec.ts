import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpHomePageService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpHomePageService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.home_page. Extend with negative cases as needed. */
test("@smoke Verify ccbp.home_page service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpHomePageService(apiClient);
  const body = svc.homePage(headers);;
  expect(body).toBeTruthy();
});

/** LLM-enriched cases from manual TC rules */
test("@journey Verify ccbp.home_page returns a non-empty list of providers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpHomePageService(apiClient);
  const response = await svc.homePage(headers);
  expect(response.providers).toBeGreaterThan(0);
});
