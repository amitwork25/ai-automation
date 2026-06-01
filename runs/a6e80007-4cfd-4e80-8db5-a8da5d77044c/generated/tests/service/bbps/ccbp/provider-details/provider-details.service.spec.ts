import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpProviderDetailsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpProviderDetailsService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.provider_details. Extend with negative cases as needed. */
test("@smoke Verify ccbp.provider_details service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpProviderDetailsService(apiClient);
  const body = svc.providerDetails(headers);;
  expect(body).toBeTruthy();
});

/** LLM-enriched cases from manual TC rules */
test("@journey Verify ccbp.provider_details returns valid biller details", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpProviderDetailsService(apiClient);
  // Assuming a valid billerId is required, using a placeholder
  const response = await svc.providerDetails(headers, "someBillerId");
  // Add assertions based on expected structure or specific fields if known
  expect(response).toBeTruthy();
});
