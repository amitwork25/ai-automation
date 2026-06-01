import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBillStatusGetResponse } from "../../../../../models/eqx/bbps/ccbp/bill-status-get.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/bill-status-get-response.schema.json";

/** Generated service for ccbp.bill_status_get. */
export class CcbpBillStatusGetService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bill/status";
  }

  async billStatusGetRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpBillStatusGetResponse>> {
    return this.api.call<CcbpBillStatusGetResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async billStatusGet(headers: Record<string, string>): Promise<CcbpBillStatusGetResponse> {
    const result = await this.billStatusGetRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.bill_status_get-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.bill_status_get");
    return result.json;
  }
}
