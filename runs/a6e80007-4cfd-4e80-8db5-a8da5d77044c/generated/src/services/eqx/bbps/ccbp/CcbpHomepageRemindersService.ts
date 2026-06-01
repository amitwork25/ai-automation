import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { HomepageRemindersResponse } from "../../../../../models/eqx/bbps/ccbp/homepage-reminders.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/homepage-reminders-response.schema.json";

/** Generated service for ccbp.homepage_reminders. */
export class CcbpHomepageRemindersService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/homepage/reminders";
  }

  async homepageRemindersRaw(headers: Record<string, string>): Promise<ApiCallResult<HomepageRemindersResponse>> {
    return this.api.call<HomepageRemindersResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async homepageReminders(headers: Record<string, string>): Promise<HomepageRemindersResponse> {
    const result = await this.homepageRemindersRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.homepage_reminders-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.homepage_reminders");
    return result.json;
  }
}
