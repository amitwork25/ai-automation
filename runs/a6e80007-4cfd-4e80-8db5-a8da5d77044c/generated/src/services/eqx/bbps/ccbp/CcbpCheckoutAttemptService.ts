import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpCheckoutAttemptRequest, CcbpCheckoutAttemptResponse } from "../../../../../models/eqx/bbps/ccbp/checkout-attempt.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/checkout-attempt-response.schema.json";

/** Generated service for ccbp.checkout_attempt. */
export class CcbpCheckoutAttemptService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/stashpayments/v2/attempts";
  }

  async checkoutAttemptRaw(payload: CcbpCheckoutAttemptRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpCheckoutAttemptResponse>> {
    return this.api.call<CcbpCheckoutAttemptResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async checkoutAttempt(payload: CcbpCheckoutAttemptRequest, headers: Record<string, string>): Promise<CcbpCheckoutAttemptResponse> {
    const result = await this.checkoutAttemptRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.checkout_attempt-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.checkout_attempt");
    return result.json;
  }
}
