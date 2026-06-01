import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpBillFetchConsentResponse } from "../../../../../models/eqx/bbps/ccbp/bill-fetch-consent.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/bill-fetch-consent-response.schema.json";

/** Generated service for ccbp.bill_fetch_consent. */
export class CcbpBillFetchConsentService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/bbps/bill-fetch/consent";
  }

  async billFetchConsentRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpBillFetchConsentResponse>> {
    return this.api.call<CcbpBillFetchConsentResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "POST",
      headers,
      
    });
  }

  async billFetchConsent(headers: Record<string, string>): Promise<CcbpBillFetchConsentResponse> {
    const result = await this.billFetchConsentRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.bill_fetch_consent-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.bill_fetch_consent");
    return result.json;
  }
}
