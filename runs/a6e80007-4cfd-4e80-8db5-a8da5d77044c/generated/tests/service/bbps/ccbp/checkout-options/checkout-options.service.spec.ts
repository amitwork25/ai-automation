import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpCheckoutOptionsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpCheckoutOptionsService";
import type { CcbpCheckoutOptionsRequest } from "../../../../../src/models/eqx/bbps/ccbp/checkout-options.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.checkout_options. Extend with negative cases as needed. */
test("@smoke Verify ccbp.checkout_options service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpCheckoutOptionsService(apiClient);
  const body = svc.checkoutOptions({} as CcbpCheckoutOptionsRequest, headers);;
  expect(body).toBeTruthy();
});
