import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpHomepageRemindersService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpHomepageRemindersService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.homepage_reminders. Extend with negative cases as needed. */
test("@smoke Verify ccbp.homepage_reminders service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpHomepageRemindersService(apiClient);
  const body = svc.homepageReminders(headers);;
  expect(body).toBeTruthy();
});
