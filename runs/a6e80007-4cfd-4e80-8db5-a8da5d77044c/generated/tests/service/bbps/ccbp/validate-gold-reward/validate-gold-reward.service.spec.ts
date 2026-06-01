import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpValidateGoldRewardService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpValidateGoldRewardService";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.validate_gold_reward. Extend with negative cases as needed. */
test("@smoke Verify ccbp.validate_gold_reward service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpValidateGoldRewardService(apiClient);
  const body = svc.validateGoldReward(headers);;
  expect(body).toBeTruthy();
});
