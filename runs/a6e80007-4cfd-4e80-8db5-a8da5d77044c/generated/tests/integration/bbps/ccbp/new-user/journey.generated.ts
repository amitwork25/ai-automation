import type { ApiClient } from "../../../../../src/core/api/ApiClient";
import {
  getCcbpTestData,
  sendOtpStep,
  verifyOtpStep,
  customerProfileStep,
  dashboardBlocksStep,
  utilityIdFromDashboardBlocks,
  bureauDataStep,
  homePageStep,
  providersListStep,
  variantsStep,
  providerDetailsStep,
  billFetchNewUserStep,
  utilitiesBillsByCustomerIdStep
} from "../shared/steps";
import type { BbpsCcbpNewUserCcbpNewUserJourneyContext } from "./types.generated";

/** Generated from 07-journey-plan.json */
export async function runBbpsCcbpNewUserCcbpNewUserJourneyGenerated(apiClient: ApiClient): Promise<BbpsCcbpNewUserCcbpNewUserJourneyContext> {
  const input = getCcbpTestData();
  const ctx: BbpsCcbpNewUserCcbpNewUserJourneyContext = { authToken: "" };

  const sendOtpRes = await sendOtpStep(apiClient, input);
  const verifyRes = await verifyOtpStep(apiClient, input, sendOtpRes.data.token);
  ctx.authToken = verifyRes.data.auth_token;
  ctx.customerProfile = await customerProfileStep(apiClient, ctx.authToken);
  const blocksBody = await dashboardBlocksStep(apiClient, ctx.authToken);
  ctx.utilityId = utilityIdFromDashboardBlocks(blocksBody);
  ctx.bureau = await bureauDataStep(apiClient, ctx.authToken);
  ctx.homepage = await homePageStep(apiClient, ctx.utilityId!, ctx.authToken);
  ctx.providers = await providersListStep(apiClient, ctx.utilityId!, ctx.authToken);
  const billerId = ctx.providers?.[0]?.billerid ?? "";
  ctx.variants = await variantsStep(apiClient, billerId, ctx.authToken);
  const billerId = ctx.providers?.[0]?.billerid ?? "";
  ctx.providerDetails = await providerDetailsStep(apiClient, billerId, ctx.authToken);
  const billerId = ctx.providers?.[0]?.billerid ?? "";
  ctx.billFetch = await billFetchNewUserStep(apiClient, ctx.authToken, billerId, ctx.providerDetails?.data?.customer_params, input.mobile, input);
  ctx.utilitiesBills = await utilitiesBillsByCustomerIdStep(apiClient, ctx.authToken, ctx.billFetch?.customer_id ?? 0);

  return ctx;
}
