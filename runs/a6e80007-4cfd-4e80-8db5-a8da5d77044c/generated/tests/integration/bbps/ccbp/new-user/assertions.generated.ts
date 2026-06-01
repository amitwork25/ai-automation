import { expect } from "@playwright/test";

/** Generated assertion checkpoint compiled from 06-business-rules-mapped.json */
export function assertBbpsCcbpNewUserCcbpNewUserJourneyGeneratedContracts(ctx: BbpsCcbpNewUserCcbpNewUserJourneyContext): void {
  expect(ctx.verify.status, "status").toBe(200);
  assertUpdateCustomerDetailsAccepted(ctx);
  expect(ctx.homepage.data.bills, "bills").length.toBe(0);
  expect(ctx.homepage.data.totalDueAmount, "totalDueAmount").toBe(0);
  expect(ctx.homepage.data.isStashGaurdEnabled, "isStashGaurdEnabled").toBe(false);
  expect(ctx.homepage.data.hasUserClaimedGoldReward, "hasUserClaimedGoldReward").toBe(false);
  expect(ctx.bureau.data.bureauBills, "bureauBills").length.toBe(0);
  expect(ctx.customerProfile.customer_id, "customer_id").toBeGreaterThan(0);
  expect(ctx.customerProfile.customer_name, "customer_name").toBeTruthy();
  expect(ctx.customerProfile.email, "email").toBeTruthy();
  expect(ctx.customerProfile.is_new_ccbp_flow, "is_new_ccbp_flow").toBe(true);
  expect(ctx.providers, "providers").length.toBeGreaterThan(0);
  expect(ctx.variants.data.variants.popularVariants, "popularVariants").length.toBeGreaterThan(0);
  expect(networkNames, "networks").toContain("Visa"); expect(networkNames, "networks").toContain("Mastercard");
  expect(ctx.providerDetails.data.biller_id, "biller_id").toBeTruthy();
  assertCcbpNewUserJourneyContracts(ctx);
  expect(ctx.utilitiesBills, "utilitiesBills").length.toBeGreaterThanOrEqual(1);
}
