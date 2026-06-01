import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpValidateGoldRewardResponse } from "../../../../../models/eqx/bbps/ccbp/validate-gold-reward.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/validate-gold-reward-response.schema.json";

/** Generated service for ccbp.validate_gold_reward. */
export class CcbpValidateGoldRewardService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/validateGoldReward";
  }

  async validateGoldRewardRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpValidateGoldRewardResponse>> {
    return this.api.call<CcbpValidateGoldRewardResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async validateGoldReward(headers: Record<string, string>): Promise<CcbpValidateGoldRewardResponse> {
    const result = await this.validateGoldRewardRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.validate_gold_reward-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.validate_gold_reward");
    return result.json;
  }
}
