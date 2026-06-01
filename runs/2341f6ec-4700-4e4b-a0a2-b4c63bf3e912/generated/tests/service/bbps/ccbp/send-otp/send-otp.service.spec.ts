import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { AuthSendOtpService } from "../../../../../src/services/eqx/bbps/ccbp/AuthSendOtpService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for auth.send_otp. Extend with negative cases as needed. */
test("@smoke Verify auth.send_otp service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new AuthSendOtpService(apiClient);
  const body = svc.sendOtp(headers);;
  expect(body).toBeTruthy();
});
