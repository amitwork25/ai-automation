import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpBilldeskWebhookService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpBilldeskWebhookService";
import type { CcbpBilldeskWebhookRequest } from "../../../../../src/models/eqx/bbps/ccbp/billdesk-webhook.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.billdesk_webhook. Extend with negative cases as needed. */
test("@smoke Verify ccbp.billdesk_webhook service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpBilldeskWebhookService(apiClient);
  const body = svc.billdeskWebhook({} as CcbpBilldeskWebhookRequest, headers);;
  expect(body).toBeTruthy();
});
