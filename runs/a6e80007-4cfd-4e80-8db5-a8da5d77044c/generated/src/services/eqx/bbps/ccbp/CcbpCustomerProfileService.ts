import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpCustomerProfileResponse } from "../../../../../models/eqx/bbps/ccbp/customer-profile.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/customer-profile-response.schema.json";

/** Generated service for ccbp.customer_profile. */
export class CcbpCustomerProfileService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/customer-profile";
  }

  async customerProfileRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpCustomerProfileResponse>> {
    return this.api.call<CcbpCustomerProfileResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async customerProfile(headers: Record<string, string>): Promise<CcbpCustomerProfileResponse> {
    const result = await this.customerProfileRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.customer_profile-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.customer_profile");
    return result.json;
  }
}
