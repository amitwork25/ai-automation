import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpProvidersListResponse } from "../../../../../models/eqx/bbps/ccbp/providers-list.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/providers-list-response.schema.json";

/** Generated service for ccbp.providers_list. */
export class CcbpProvidersListService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/utilities/{utilityId}/providers";
  }

  async providersListRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpProvidersListResponse>> {
    return this.api.call<CcbpProvidersListResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async providersList(headers: Record<string, string>): Promise<CcbpProvidersListResponse> {
    const result = await this.providersListRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.providers_list-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.providers_list");
    return result.json;
  }
}
