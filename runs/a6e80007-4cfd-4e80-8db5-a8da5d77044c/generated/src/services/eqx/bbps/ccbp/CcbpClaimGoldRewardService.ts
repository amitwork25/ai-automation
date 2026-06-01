import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { ClaimGoldRewardRequest, ClaimGoldRewardResponse } from "../../../../../models/eqx/bbps/ccbp/claim-gold-reward.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/claim-gold-reward-response.schema.json";

/** Generated service for ccbp.claim_gold_reward. */
export class CcbpClaimGoldRewardService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/claim-reward/gold";
  }

  async claimGoldRewardRaw(payload: ClaimGoldRewardRequest, headers: Record<string, string>): Promise<ApiCallResult<ClaimGoldRewardResponse>> {
    return this.api.call<ClaimGoldRewardResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      body: payload,
    });
  }

  async claimGoldReward(payload: ClaimGoldRewardRequest, headers: Record<string, string>): Promise<ClaimGoldRewardResponse> {
    const result = await this.claimGoldRewardRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.claim_gold_reward-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.claim_gold_reward");
    return result.json;
  }
}
