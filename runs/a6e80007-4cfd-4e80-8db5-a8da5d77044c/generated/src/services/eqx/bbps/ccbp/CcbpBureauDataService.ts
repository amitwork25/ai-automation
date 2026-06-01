import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBureauDataResponse } from "../../../../../models/eqx/bbps/ccbp/bureau-data.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/bureau-data-response.schema.json";

/** Generated service for ccbp.bureau_data. */
export class CcbpBureauDataService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/homepage/bureauData";
  }

  async bureauDataRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpBureauDataResponse>> {
    return this.api.call<CcbpBureauDataResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async bureauData(headers: Record<string, string>): Promise<CcbpBureauDataResponse> {
    const result = await this.bureauDataRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.bureau_data-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.bureau_data");
    return result.json;
  }
}
