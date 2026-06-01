import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { HomepageWidgetsResponse } from "../../../../../models/eqx/bbps/ccbp/homepage-widgets.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/homepage-widgets-response.schema.json";

/** Generated service for ccbp.homepage_widgets. */
export class CcbpHomepageWidgetsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/homepage/widgets";
  }

  async homepageWidgetsRaw(headers: Record<string, string>): Promise<ApiCallResult<HomepageWidgetsResponse>> {
    return this.api.call<HomepageWidgetsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async homepageWidgets(headers: Record<string, string>): Promise<HomepageWidgetsResponse> {
    const result = await this.homepageWidgetsRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.homepage_widgets-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.homepage_widgets");
    return result.json;
  }
}
