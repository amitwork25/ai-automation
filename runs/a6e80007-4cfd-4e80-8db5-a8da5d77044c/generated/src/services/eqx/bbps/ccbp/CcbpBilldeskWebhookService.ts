import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBilldeskWebhookRequest, CcbpBilldeskWebhookResponse } from "../../../../../models/eqx/bbps/ccbp/billdesk-webhook.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/billdesk-webhook-response.schema.json";

/** Generated service for ccbp.billdesk_webhook. */
export class CcbpBilldeskWebhookService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/billdesk/webhook";
  }

  async billdeskWebhookRaw(payload: CcbpBilldeskWebhookRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpBilldeskWebhookResponse>> {
    return this.api.call<CcbpBilldeskWebhookResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async billdeskWebhook(payload: CcbpBilldeskWebhookRequest, headers: Record<string, string>): Promise<CcbpBilldeskWebhookResponse> {
    const result = await this.billdeskWebhookRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.billdesk_webhook-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.billdesk_webhook");
    return result.json;
  }
}
