import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBureauDataService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpBureauDataService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.bureau_data. Extend with negative cases as needed. */
test("@smoke Verify ccbp.bureau_data service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBureauDataService(apiClient);
  const body = svc.bureauData(headers);;
  expect(body).toBeTruthy();
});
