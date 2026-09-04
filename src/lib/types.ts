// This file defines the shape of every data object that flows through the
// app. TypeScript "type" declarations are compile-time only -- they vanish
// at runtime, but they let the editor and compiler catch mistakes like
// "you forgot to set order_id" before the code ever runs.

export type SettlementLineType = "payment" | "refund" | "adjustment";

export interface SettlementLine {
  entity_id: string;
  type: SettlementLineType;
  debit: number;   // paise
  credit: number;  // paise
  amount: number;  // paise, gross
  fee: number;     // paise
  tax: number;     // paise
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
  order_amount: number; // rupees
  method: string;
  created_at: string;
  status: string;
}

export interface BankRow {
  bank_txn_id: string;
  utr: string;
  credited_amount: number; // rupees
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
  amount: number; // rupees
  confidence: number; // 0-1
  explanation: string;
  suggested_action: string;
  // true only when Claude actually re-reasoned this exception (see
  // llmClassifier.ts). Undefined/false means it's still the deterministic
  // rule-engine's original classification -- the frontend uses this to
  // visibly distinguish "AI judgment" from "rule match", which is the
  // whole point of adding the LLM step.
  ai_reasoned?: boolean;
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
}

export interface Report {
  summary: ReportSummary;
  exceptions_by_category: Record<string, { count: number; amount: number }>;
  exceptions: Exception[];
  // Forensic-accounting anomaly check on the UNEXPLAINED bucket -- see
  // benfordCheck.ts. Honestly gated on sample size: `flagged` can only be
  // true when `sufficientSample` is also true, so a small hackathon-scale
  // dataset never gets a misleading verdict either way.
  benford: import("./benfordCheck").BenfordResult;
}
