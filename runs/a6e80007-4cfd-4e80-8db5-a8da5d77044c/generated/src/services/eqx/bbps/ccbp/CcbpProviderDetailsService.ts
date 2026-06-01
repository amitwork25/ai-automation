import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpProviderDetailsResponse } from "../../../../../models/eqx/bbps/ccbp/provider-details.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/provider-details-response.schema.json";

/** Generated service for ccbp.provider_details. */
export class CcbpProviderDetailsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/provider/{billerId}";
  }

  async providerDetailsRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpProviderDetailsResponse>> {
    return this.api.call<CcbpProviderDetailsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async providerDetails(headers: Record<string, string>): Promise<CcbpProviderDetailsResponse> {
    const result = await this.providerDetailsRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.provider_details-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.provider_details");
    return result.json;
  }
}
