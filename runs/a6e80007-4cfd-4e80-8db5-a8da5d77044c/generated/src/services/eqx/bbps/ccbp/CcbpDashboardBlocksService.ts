import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { DashboardBlocksRequest, DashboardBlocksResponse } from "../../../../../models/eqx/bbps/ccbp/dashboard-blocks.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/dashboard-blocks-response.schema.json";

/** Generated service for ccbp.dashboard_blocks. */
export class CcbpDashboardBlocksService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/dashboard/blocks";
  }

  async dashboardBlocksRaw(payload: DashboardBlocksRequest, headers: Record<string, string>): Promise<ApiCallResult<DashboardBlocksResponse>> {
    return this.api.call<DashboardBlocksResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async dashboardBlocks(payload: DashboardBlocksRequest, headers: Record<string, string>): Promise<DashboardBlocksResponse> {
    const result = await this.dashboardBlocksRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.dashboard_blocks-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.dashboard_blocks");
    return result.json;
  }
}
