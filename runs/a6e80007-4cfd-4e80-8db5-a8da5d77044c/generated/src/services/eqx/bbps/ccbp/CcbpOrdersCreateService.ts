import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpOrdersCreateRequest, CcbpOrdersCreateResponse } from "../../../../../models/eqx/bbps/ccbp/orders-create.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/orders-create-response.schema.json";

/** Generated service for ccbp.orders_create. */
export class CcbpOrdersCreateService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/v2/orders/create";
  }

  async ordersCreateRaw(payload: CcbpOrdersCreateRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpOrdersCreateResponse>> {
    return this.api.call<CcbpOrdersCreateResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async ordersCreate(payload: CcbpOrdersCreateRequest, headers: Record<string, string>): Promise<CcbpOrdersCreateResponse> {
    const result = await this.ordersCreateRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.orders_create-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.orders_create");
    return result.json;
  }
}
