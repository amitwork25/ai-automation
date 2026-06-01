import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBillFetchRequest, CcbpBillFetchResponse } from "../../../../../models/eqx/bbps/ccbp/bill-fetch.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/bill-fetch-response.schema.json";

/** Generated service for ccbp.bill_fetch. */
export class CcbpBillFetchService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/bill-fetch";
  }

  async billFetchRaw(payload: CcbpBillFetchRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpBillFetchResponse>> {
    return this.api.call<CcbpBillFetchResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async billFetch(payload: CcbpBillFetchRequest, headers: Record<string, string>): Promise<CcbpBillFetchResponse> {
    const result = await this.billFetchRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.bill_fetch-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.bill_fetch");
    return result.json;
  }
}
