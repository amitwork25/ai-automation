import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBillStatusGetService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpBillStatusGetService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.bill_status_get. Extend with negative cases as needed. */
test("@smoke Verify ccbp.bill_status_get service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBillStatusGetService(apiClient);
  const body = svc.billStatusGet(headers);;
  expect(body).toBeTruthy();
});
