import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpVariantsResponse } from "../../../../../models/eqx/bbps/ccbp/variants.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/variants-response.schema.json";

/** Generated service for ccbp.variants. */
export class CcbpVariantsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/variants";
  }

  async variantsRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpVariantsResponse>> {
    return this.api.call<CcbpVariantsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async variants(headers: Record<string, string>): Promise<CcbpVariantsResponse> {
    const result = await this.variantsRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.variants-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.variants");
    return result.json;
  }
}
