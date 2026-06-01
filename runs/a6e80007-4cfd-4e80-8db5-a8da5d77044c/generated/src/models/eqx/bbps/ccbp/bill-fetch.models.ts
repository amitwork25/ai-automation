/** Generated from ccbp.bill_fetch (POST /bbps/v1/billDesk/bbps/bill-fetch). */

export interface CcbpBillFetchResponse {
  customer_id?: number;
  validation_id?: string;
  biller_id?: string;
  utility_id?: number;
  bill_amount?: number;
  bill_status?: string;
  account_no?: string;
  display_account_no?: string;
  bill_number?: string;
  provider_name?: string;
}


export interface CcbpBillFetchRequest {
  billerId: string;
  authenticators: Record<string, unknown>[];
  billFetchApproval: number;
  foundViaSms: boolean;
  isNewFlow?: boolean;
}

