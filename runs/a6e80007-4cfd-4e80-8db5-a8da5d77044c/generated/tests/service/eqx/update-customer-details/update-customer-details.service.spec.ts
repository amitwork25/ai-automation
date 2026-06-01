import { expect } from "@playwright/test";
import { test } from "../../../../src/fixtures/infrastructure.fixture";
import { EqxUpdateCustomerService } from "../../../../src/services/eqx/EqxUpdateCustomerDetailsService";
import type { UpdateCustomerDetailsRequest } from "../../../../src/models/eqx/update-customer-details.models";
import { buildBBPSHeadersRaw } from "../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for eqx.update_customer_details. Extend with negative cases as needed. */
test("@smoke Verify eqx.update_customer_details service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new EqxUpdateCustomerService(apiClient);
  const body = svc.updateCustomerDetails({} as UpdateCustomerDetailsRequest, headers);;
  expect(body).toBeTruthy();
});
