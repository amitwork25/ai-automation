import type { ApiClient } from "../../../../../src/core/api/ApiClient";
import {
  getCcbpTestData,
  sendOtpStep,
  verifyOtpStep,
  billFetchNewUserStep
} from "../shared/steps";
import type { BbpsCcbpNewUserSmokeContext } from "./types.generated";

/** Generated from 07-journey-plan.json */
export async function runBbpsCcbpNewUserSmokeGenerated(apiClient: ApiClient): Promise<BbpsCcbpNewUserSmokeContext> {
  const input = getCcbpTestData();
  const ctx: BbpsCcbpNewUserSmokeContext = { authToken: "" };

  const sendOtpRes = await sendOtpStep(apiClient, input);
  const verifyRes = await verifyOtpStep(apiClient, input, sendOtpRes.data.token);
  ctx.authToken = verifyRes.data.auth_token;
  const billerId = ctx.providers?.[0]?.billerid ?? "";
  ctx.billFetch = await billFetchNewUserStep(apiClient, ctx.authToken, billerId, ctx.providerDetails?.data?.customer_params, input.mobile, input);

  return ctx;
}
