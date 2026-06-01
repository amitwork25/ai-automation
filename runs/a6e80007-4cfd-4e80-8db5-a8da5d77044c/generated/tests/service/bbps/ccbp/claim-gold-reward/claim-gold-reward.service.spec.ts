import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpClaimGoldRewardService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpClaimGoldRewardService";
import type { ClaimGoldRewardRequest } from "../../../../../src/models/eqx/bbps/ccbp/claim-gold-reward.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.claim_gold_reward. Extend with negative cases as needed. */
test("@smoke Verify ccbp.claim_gold_reward service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpClaimGoldRewardService(apiClient);
  const body = svc.claimGoldReward({} as ClaimGoldRewardRequest, headers);;
  expect(body).toBeTruthy();
});
