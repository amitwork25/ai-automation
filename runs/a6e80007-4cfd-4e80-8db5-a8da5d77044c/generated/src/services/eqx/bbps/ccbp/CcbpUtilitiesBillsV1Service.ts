import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpUtilitiesBillsV1Response } from "../../../../../models/eqx/bbps/ccbp/utilities-bills-v1.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/utilities-bills-v1-response.schema.json";

/** Generated service for ccbp.utilities_bills_v1. */
export class CcbpBillDeskBillsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/utilities/{customerId}/bills";
  }

  async utilitiesBillsByCustomerIdRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpUtilitiesBillsV1Response>> {
    return this.api.call<CcbpUtilitiesBillsV1Response>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async utilitiesBillsByCustomerId(headers: Record<string, string>): Promise<CcbpUtilitiesBillsV1Response> {
    const result = await this.utilitiesBillsByCustomerIdRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.utilities_bills_v1-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.utilities_bills_v1");
    return result.json;
  }
}
