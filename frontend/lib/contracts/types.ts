/**
 * TypeScript types for the GenLayer Corroborate contract
 */

export interface PriceCheck {
  symbol: string;
  source_a_price_micros: string;
  source_b_price_micros: string;
  deviation_bps: string;
  corroborated: boolean;
  checked_at: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
