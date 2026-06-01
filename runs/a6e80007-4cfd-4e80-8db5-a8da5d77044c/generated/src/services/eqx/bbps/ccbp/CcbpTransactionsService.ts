import type { ApiClient } from "../../../../../core/api/ApiClient";
import type { ApiCallResult } from "../../../../../core/types/HttpTypes";
import { PerformanceValidator } from "../../../../../core/validation/PerformanceValidator";
import { ResponseValidator } from "../../../../../core/validation/ResponseValidator";
import { SchemaValidator } from "../../../../../core/validation/SchemaValidator";
import type { CcbpTransactionsResponse } from "../../../../../models/eqx/bbps/ccbp/transactions.models";

const SCHEMA = "src/schemas/eqx/bbps/ccbp/transactions-response.schema.json";

/** Generated service for ccbp.transactions. */
export class CcbpTransactionsService {
  constructor(private readonly api: ApiClient) {}

  private endpointPath(): string {
    return "/bbps/v1/billDesk/transactions/{customerId}";
  }

  async transactionsRaw(headers: Record<string, string>): Promise<ApiCallResult<CcbpTransactionsResponse>> {
    return this.api.call<CcbpTransactionsResponse>({
      service: "eqx",
      endpoint: this.endpointPath(),
      method: "GET",
      headers,
      
    });
  }

  async transactions(headers: Record<string, string>): Promise<CcbpTransactionsResponse> {
    const result = await this.transactionsRaw(headers);
    await ResponseValidator.status(result.status, 200);
    await SchemaValidator.validateFromFile(SCHEMA, result.json, "ccbp.transactions-response");
    await PerformanceValidator.responseTime(result.durationMs, 20_000, "ccbp.transactions");
    return result.json;
  }
}
