import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpOrdersCreateService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpOrdersCreateService";
import type { CcbpOrdersCreateRequest } from "../../../../../src/models/eqx/bbps/ccbp/orders-create.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.orders_create. Extend with negative cases as needed. */
test("@smoke Verify ccbp.orders_create service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpOrdersCreateService(apiClient);
  const body = svc.ordersCreate({} as CcbpOrdersCreateRequest, headers);;
  expect(body).toBeTruthy();
});
