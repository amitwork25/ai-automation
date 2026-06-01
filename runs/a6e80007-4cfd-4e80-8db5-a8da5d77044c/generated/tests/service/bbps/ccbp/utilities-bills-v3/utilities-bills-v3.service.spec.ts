import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBillDeskBillsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpUtilitiesBillsV3Service";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.utilities_bills_v3. Extend with negative cases as needed. */
test("@smoke Verify ccbp.utilities_bills_v3 service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBillDeskBillsService(apiClient);
  const body = svc.utilitiesBillsByCustomerId(headers);;
  expect(body).toBeTruthy();
});
