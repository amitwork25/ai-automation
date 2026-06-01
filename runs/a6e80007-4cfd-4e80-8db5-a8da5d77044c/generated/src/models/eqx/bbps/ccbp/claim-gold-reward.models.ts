/** Generated from ccbp.claim_gold_reward (POST /bbps/v1/billDesk/claim-reward/gold). */

export interface ClaimGoldRewardResponse {
  greeting?: string;
  heading?: string;
}


export interface ClaimGoldRewardRequest {
  order_id: string;
  amount: number;
  pincode?: number;
}

