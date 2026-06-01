import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { AuthVerifyOtpService } from "../../../../../src/services/eqx/bbps/ccbp/AuthVerifyOtpService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for auth.verify_otp. Extend with negative cases as needed. */
test("@smoke Verify auth.verify_otp service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new AuthVerifyOtpService(apiClient);
  const body = svc.verifyOtp(headers);;
  expect(body).toBeTruthy();
});
