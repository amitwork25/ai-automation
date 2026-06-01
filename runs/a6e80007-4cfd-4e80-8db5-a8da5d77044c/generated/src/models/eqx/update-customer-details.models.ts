/** Generated from eqx.update_customer_details (PUT /update-customer-details). */

export interface UpdateCustomerDetailsResponse {
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
}


export interface UpdateCustomerDetailsRequest {
  device_id: string;
  first_name: string;
  last_name: string;
  lead_source?: string;
  pull_type?: "short_pull" | "long_pull";
}

