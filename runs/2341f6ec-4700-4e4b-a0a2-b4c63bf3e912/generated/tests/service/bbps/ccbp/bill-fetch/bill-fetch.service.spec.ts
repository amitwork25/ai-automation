import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBillFetchService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpBillFetchService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.bill_fetch. Extend with negative cases as needed. */
test("@smoke Verify ccbp.bill_fetch service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBillFetchService(apiClient);
  const body = svc.billFetch(headers);;
  expect(body).toBeTruthy();
});
