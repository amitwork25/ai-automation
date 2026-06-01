import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBillStatusPatchResponse } from "../../../../../models/eqx/bbps/ccbp/bill-status-patch.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/bill-status-patch-response.schema.json";

/** Generated service for ccbp.bill_status_patch. */
export class CcbpBillStatusPatchService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bill/status";
  }

  async billStatusPatchRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpBillStatusPatchResponse>> {
    return this.api.call<CcbpBillStatusPatchResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "PATCH",
      headers,
      
    });
  }

  async billStatusPatch(headers: Record<string, string>): Promise<CcbpBillStatusPatchResponse> {
    const result = await this.billStatusPatchRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.bill_status_patch-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.bill_status_patch");
    return result.json;
  }
}
