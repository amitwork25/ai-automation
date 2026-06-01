import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpCustomerProfileService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpCustomerProfileService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.customer_profile. Extend with negative cases as needed. */
test("@smoke Verify ccbp.customer_profile service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpCustomerProfileService(apiClient);
  const body = svc.customerProfile(headers);;
  expect(body).toBeTruthy();
});
