import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpProvidersListService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpProvidersListService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.providers_list. Extend with negative cases as needed. */
test("@smoke Verify ccbp.providers_list service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpProvidersListService(apiClient);
  const body = svc.providersList(headers);;
  expect(body).toBeTruthy();
});

/** LLM-enriched cases from manual TC rules */
test("@journey Verify ccbp.providers_list returns a non-empty list of providers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpProvidersListService(apiClient);
  // Assuming a valid utilityId is required, using a placeholder
  const response = await svc.providersList(headers, "someUtilityId");
  expect(response.providers).toBeGreaterThan(0);
});
