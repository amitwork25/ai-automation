import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpOrdersCreateAutoAttemptService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpOrdersCreateAutoAttemptService";
import type { CcbpOrdersCreateAutoAttemptRequest } from "../../../../../src/models/eqx/bbps/ccbp/orders-create-auto-attempt.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.orders_create_auto_attempt. Extend with negative cases as needed. */
test("@smoke Verify ccbp.orders_create_auto_attempt service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpOrdersCreateAutoAttemptService(apiClient);
  const body = svc.ordersCreateAutoAttempt({} as CcbpOrdersCreateAutoAttemptRequest, headers);;
  expect(body).toBeTruthy();
});
