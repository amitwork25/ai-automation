import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { AuthVerifyOtpResponse } from "../../../../../models/eqx/bbps/ccbp/verify-otp.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/verify-otp-response.schema.json";

/** Generated service for auth.verify_otp. */
export class AuthVerifyOtpService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/auth/verify-otp";
  }

  async verifyOtpRaw(headers: Record<string, string>): Promise<ApiCallResult<AuthVerifyOtpResponse>> {
    return this.api.call<AuthVerifyOtpResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      
    });
  }

  async verifyOtp(headers: Record<string, string>): Promise<AuthVerifyOtpResponse> {
    const result = await this.verifyOtpRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "auth.verify_otp-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "auth.verify_otp");
    return result.json;
  }
}
