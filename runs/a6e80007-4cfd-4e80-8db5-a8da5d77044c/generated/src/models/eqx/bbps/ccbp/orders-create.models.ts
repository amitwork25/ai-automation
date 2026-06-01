/** Generated from ccbp.orders_create (POST /bbps/v1/billDesk/bbps/v2/orders/create). */

export interface CcbpOrdersCreateResponse {
  status?: string;
  status_code?: number;
  data?: Record<string, unknown>;
}


export interface CcbpOrdersCreateRequest {
  billerId: string;
  account_no: string;
  amount: string;
  category: string;
  offerId: number;
  validationId: string;
  customer_params: Record<string, unknown>[];
  isNewFlow: boolean;
}

