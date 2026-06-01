import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpOrdersCreateAutoAttemptRequest, CcbpOrdersCreateAutoAttemptResponse } from "../../../../../models/eqx/bbps/ccbp/orders-create-auto-attempt.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/orders-create-auto-attempt-response.schema.json";

/** Generated service for ccbp.orders_create_auto_attempt. */
export class CcbpOrdersCreateAutoAttemptService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/v2/orders/create/auto-attempt";
  }

  async ordersCreateAutoAttemptRaw(payload: CcbpOrdersCreateAutoAttemptRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpOrdersCreateAutoAttemptResponse>> {
    return this.api.call<CcbpOrdersCreateAutoAttemptResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async ordersCreateAutoAttempt(payload: CcbpOrdersCreateAutoAttemptRequest, headers: Record<string, string>): Promise<CcbpOrdersCreateAutoAttemptResponse> {
    const result = await this.ordersCreateAutoAttemptRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.orders_create_auto_attempt-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.orders_create_auto_attempt");
    return result.json;
  }
}
