import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpComplaintsRequest, CcbpComplaintsResponse } from "../../../../../models/eqx/bbps/ccbp/complaints.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/complaints-response.schema.json";

/** Generated service for ccbp.complaints. */
export class CcbpComplaintsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/complaints";
  }

  async complaintsRaw(payload: CcbpComplaintsRequest, headers: Record<string, string>): Promise<ApiCallResult<CcbpComplaintsResponse>> {
    return this.api.call<CcbpComplaintsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async complaints(payload: CcbpComplaintsRequest, headers: Record<string, string>): Promise<CcbpComplaintsResponse> {
    const result = await this.complaintsRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.complaints-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.complaints");
    return result.json;
  }
}
