import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpPaymentsCallbackService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpPaymentsCallbackService";
import type { CcbpPaymentsCallbackRequest } from "../../../../../src/models/eqx/bbps/ccbp/payments-callback.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.payments_callback. Extend with negative cases as needed. */
test("@smoke Verify ccbp.payments_callback service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpPaymentsCallbackService(apiClient);
  const body = svc.paymentsCallback({} as CcbpPaymentsCallbackRequest, headers);;
  expect(body).toBeTruthy();
});
