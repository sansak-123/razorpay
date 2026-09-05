export type SettlementLineType = "payment" | "refund" | "adjustment";

export interface SettlementLine {
  entity_id: string;
  type: SettlementLineType;
  debit: number;
  credit: number;
  amount: number;
  fee: number;
  tax: number;
  settlement_id: string;
  settlement_utr: string;
  order_id: string;
  method: string;
  card_network: string;
  settled_at: string;
}

export interface Order {
  order_id: string;
  payment_id: string;
  order_amount: number;
  method: string;
  created_at: string;
  status: string;
}

export interface BankRow {
  bank_txn_id: string;
  utr: string;
  credited_amount: number;
  value_date: string;
}

export type ExceptionCategory =
  | "DUPLICATE"
  | "REFUND"
  | "ROUNDING"
  | "UNEXPLAINED";

export interface Exception {
  order_id: string;
  settlement_id: string;
  category: ExceptionCategory;
  amount: number;
  confidence: number;
  explanation: string;
  suggested_action: string;

  ai_reasoned?: boolean;

  verification_failed?: boolean;

  verification_failure_reason?: string;
}

export interface ReportSummary {
  total_orders: number;
  matched_orders: number;
  match_rate_pct: number;
  baseline_manual_match_rate_pct: number;
  total_fee_deducted: number;
  total_tax_deducted: number;
  gst_itc_claimable: number;
  gst_itc_at_risk: number;
  money_surfaced_by_agent: number;
  total_exceptions: number;
  unresolved_exceptions: number;
  ai_reasoned_count: number;

  ai_verification_failed_count: number;
}

export interface Report {
  summary: ReportSummary;
  exceptions_by_category: Record<string, { count: number; amount: number }>;
  exceptions: Exception[];

  benford: import("./benfordCheck").BenfordResult;
}
