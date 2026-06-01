import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBillFetchConsentService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpBillFetchConsentService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.bill_fetch_consent. Extend with negative cases as needed. */
test("@smoke Verify ccbp.bill_fetch_consent service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBillFetchConsentService(apiClient);
  const body = svc.billFetchConsent(headers);;
  expect(body).toBeTruthy();
});
