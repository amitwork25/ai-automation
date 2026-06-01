/** Generated from ccbp.billdesk_webhook (POST /bbps/v1/billDesk/bbps/billdesk/webhook). */

export interface CcbpBilldeskWebhookResponse {
  [key: string]: unknown;
}


export interface CcbpBilldeskWebhookRequest {
  order_id: string;
  status: string;
  client_id: string;
  payment_method: Record<string, unknown>;
}

