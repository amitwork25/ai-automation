import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpHomePageResponse } from "../../../../../models/eqx/bbps/ccbp/home-page.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/home-page-response.schema.json";

/** Generated service for ccbp.home_page. */
export class CcbpHomePageService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/home-page";
  }

  async homePageRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpHomePageResponse>> {
    return this.api.call<CcbpHomePageResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async homePage(headers: Record<string, string>): Promise<CcbpHomePageResponse> {
    const result = await this.homePageRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.home_page-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.home_page");
    return result.json;
  }
}
