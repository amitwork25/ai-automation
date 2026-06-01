import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpCheckoutAttemptService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpCheckoutAttemptService";
import type { CcbpCheckoutAttemptRequest } from "../../../../../src/models/eqx/bbps/ccbp/checkout-attempt.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.checkout_attempt. Extend with negative cases as needed. */
test("@smoke Verify ccbp.checkout_attempt service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpCheckoutAttemptService(apiClient);
  const body = svc.checkoutAttempt({} as CcbpCheckoutAttemptRequest, headers);;
  expect(body).toBeTruthy();
});
