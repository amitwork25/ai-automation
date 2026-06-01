import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpTransactionsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpTransactionsService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.transactions. Extend with negative cases as needed. */
test("@smoke Verify ccbp.transactions service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpTransactionsService(apiClient);
  const body = svc.transactions(headers);;
  expect(body).toBeTruthy();
});
