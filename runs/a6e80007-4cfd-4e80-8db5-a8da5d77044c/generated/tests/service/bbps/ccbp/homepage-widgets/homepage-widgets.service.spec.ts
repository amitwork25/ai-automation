import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpHomepageWidgetsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpHomepageWidgetsService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.homepage_widgets. Extend with negative cases as needed. */
test("@smoke Verify ccbp.homepage_widgets service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpHomepageWidgetsService(apiClient);
  const body = svc.homepageWidgets(headers);;
  expect(body).toBeTruthy();
});
