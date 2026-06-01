import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBillDeskUtilitiesBillsResponse } from "../../../../../models/eqx/bbps/ccbp/utilities-bills-v3.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/utilities-bills-v3-response.schema.json";

/** Generated service for ccbp.utilities_bills_v3. */
export class CcbpBillDeskBillsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v3/billDesk/utilities/{customerId}/bills";
  }

  async utilitiesBillsByCustomerIdRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpBillDeskUtilitiesBillsResponse>> {
    return this.api.call<CcbpBillDeskUtilitiesBillsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async utilitiesBillsByCustomerId(headers: Record<string, string>): Promise<CcbpBillDeskUtilitiesBillsResponse> {
    const result = await this.utilitiesBillsByCustomerIdRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.utilities_bills_v3-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.utilities_bills_v3");
    return result.json;
  }
}
