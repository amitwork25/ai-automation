import type { ApiClient } from "../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../core/validation/SchemaValidator";
import type { UpdateCustomerDetailsRequest, UpdateCustomerDetailsResponse } from "../../../models/eqx/update-customer-details.models";

const SCHEMA = "src/schemas/eqx/update-customer-details-response.schema.json";

/** Generated service for eqx.update_customer_details. */
export class EqxUpdateCustomerService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/update-customer-details";
  }

  async updateCustomerDetailsRaw(payload: UpdateCustomerDetailsRequest, headers: Record<string, string>): Promise<ApiCallResult<UpdateCustomerDetailsResponse>> {
    return this.api.call<UpdateCustomerDetailsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "PUT",
      headers,
      body: payload,
    });
  }

  async updateCustomerDetails(payload: UpdateCustomerDetailsRequest, headers: Record<string, string>): Promise<UpdateCustomerDetailsResponse> {
    const result = await this.updateCustomerDetailsRaw(payload, headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "eqx.update_customer_details-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "eqx.update_customer_details");
    return result.json;
  }
}
