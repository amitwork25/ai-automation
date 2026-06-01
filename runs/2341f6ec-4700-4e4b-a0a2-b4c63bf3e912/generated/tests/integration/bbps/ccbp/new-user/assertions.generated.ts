import { expect } from "@playwright/test";

/** Generated assertion checkpoint compiled from 06-business-rules-mapped.json */
export function assertBbpsCcbpNewUserSmokeGeneratedContracts(ctx: BbpsCcbpNewUserSmokeContext): void {
  expect(ctx.status, "status").toBe(200);
}
