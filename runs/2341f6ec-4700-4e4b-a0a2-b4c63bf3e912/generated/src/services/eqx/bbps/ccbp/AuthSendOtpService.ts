import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { AuthSendOtpResponse } from "../../../../../models/eqx/bbps/ccbp/send-otp.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/send-otp-response.schema.json";

/** Generated service for auth.send_otp. */
export class AuthSendOtpService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/auth/send-otp";
  }

  async sendOtpRaw(headers: Record<string, string>): Promise<ApiCallResult<AuthSendOtpResponse>> {
    return this.api.call<AuthSendOtpResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      
    });
  }

  async sendOtp(headers: Record<string, string>): Promise<AuthSendOtpResponse> {
    const result = await this.sendOtpRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "auth.send_otp-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "auth.send_otp");
    return result.json;
  }
}
