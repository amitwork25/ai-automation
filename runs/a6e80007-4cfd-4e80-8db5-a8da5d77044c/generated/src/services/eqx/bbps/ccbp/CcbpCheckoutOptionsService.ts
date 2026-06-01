import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpCheckoutOptionsRequest, CcbpCheckoutOptionsResponse } from "../../../../../models/eqx/bbps/ccbp/checkout-options.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/checkout-options-response.schema.json";

/** Generated service for ccbp.checkout_options. */
export class CcbpCheckoutOptionsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/stashpayments/v2/checkout/options";
  }

  async checkoutOptionsRaw(payload: CcbpCheckoutOptionsRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpCheckoutOptionsResponse>> {
    return this.api.call<CcbpCheckoutOptionsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async checkoutOptions(payload: CcbpCheckoutOptionsRequest, headers: Record<string, string>): Promise<CcbpCheckoutOptionsResponse> {
    const result = await this.checkoutOptionsRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.checkout_options-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.checkout_options");
    return result.json;
  }
}
