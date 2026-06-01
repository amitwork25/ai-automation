import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpPaymentsCallbackRequest, CcbpPaymentsCallbackResponse } from "../../../../../models/eqx/bbps/ccbp/payments-callback.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/payments-callback-response.schema.json";

/** Generated service for ccbp.payments_callback. */
export class CcbpPaymentsCallbackService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/payments/callback";
  }

  async paymentsCallbackRaw(payload: CcbpPaymentsCallbackRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpPaymentsCallbackResponse>> {
    return this.api.call<CcbpPaymentsCallbackResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async paymentsCallback(payload: CcbpPaymentsCallbackRequest, headers: Record<string, string>): Promise<CcbpPaymentsCallbackResponse> {
    const result = await this.paymentsCallbackRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.payments_callback-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.payments_callback");
    return result.json;
  }
}
