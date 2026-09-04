import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { SettlementLine, Order, BankRow } from "./types";
import type { GeneratedData } from "./generateData";

// --- What MCP is doing here, concretely -----------------------------------
// MCP (Model Context Protocol) is a standard way for a client (this app) to
// discover and call "tools" exposed by a remote server (Razorpay's), over a
// normal HTTP connection -- similar in spirit to a REST API, but with a
// shared protocol for tool discovery/schemas instead of you hand-reading
// Razorpay's API docs and guessing field names. Razorpay hosts their own
// MCP server at https://mcp.razorpay.com/mcp; we connect to it as a client,
// list its available tools, and call the settlement ones directly -- no
// Docker, no local server process required, since this is the *remote*
// deployment.

const RAZORPAY_MCP_URL = "https://mcp.razorpay.com/mcp";

function getAuthHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env.local " +
        "to use live mode. Get test-mode keys from your Razorpay Dashboard " +
        "under Settings > API Keys (use the rzp_test_ ones, not live keys)."
    );
  }
  // Razorpay's MCP server uses HTTP Basic auth: base64("key_id:key_secret").
  // This is the same auth scheme Razorpay's REST API itself uses -- the MCP
  // layer doesn't invent a new one.
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function connectClient(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL(RAZORPAY_MCP_URL),
    {
      requestInit: {
        headers: { Authorization: getAuthHeader() },
      },
    }
  );

  const client = new Client(
    { name: "unsettle", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}

// Shape returned by Razorpay's fetch_all_settlements tool. We only type the
// fields we actually use -- the real response has more (created_at as unix
// timestamp, status, etc.) that don't matter for this reconciliation.
interface RazorpaySettlement {
  id: string;
  amount: number; // paise
  fees: number; // paise
  tax: number; // paise
  utr: string;
  status: string;
}

// Shape returned by the settlement recon tool -- the line-item breakdown
// per settlement (payments, refunds, adjustments within it).
interface RazorpayReconItem {
  entity_id: string;
  type: "payment" | "refund" | "adjustment" | "transfer";
  debit: number;
  credit: number;
  amount: number;
  fee: number;
  tax: number;
  settlement_id: string;
  order_id: string;
  method: string;
  card_network?: string;
}

/**
 * Pulls live test-mode settlement + order + bank data via Razorpay's MCP
 * server and reshapes it into the same GeneratedData contract that
 * generateData() produces -- this is the whole point of the abstraction:
 * SettlementUnpacker (reconcile.ts) never needs to know whether its input
 * came from synthetic data or a real account.
 */
export async function fetchLiveSettlementData(): Promise<GeneratedData> {
  const client = await connectClient();

  try {
    // 1. Fetch settlements list (gives us the batch-level UTR + totals,
    //    which stands in for "the bank statement" -- Razorpay settles
    //    directly to the linked bank account, so the settlement UTR *is*
    //    what appears on the merchant's bank statement).
    const settlementsResult = await client.callTool({
      name: "fetch_all_settlements",
      arguments: { count: 100 },
    });
    const settlements = parseToolResult<{ items: RazorpaySettlement[] }>(
      settlementsResult
    ).items;

    // 2. Fetch the recon (line-item) breakdown for each settlement. In
    //    production you'd batch/paginate this; for a hackathon-scale demo
    //    (a handful of settlements) sequential calls are fine and keep the
    //    code readable.
    const allReconItems: RazorpayReconItem[] = [];
    for (const s of settlements) {
      const reconResult = await client.callTool({
        name: "fetch_settlement_recon_details",
        arguments: { settlement_id: s.id },
      });
      const items = parseToolResult<{ items: RazorpayReconItem[] }>(
        reconResult
      ).items;
      allReconItems.push(...items);
    }

    // 3. Fetch orders so we have a ledger to match settlement lines against.
    //    (Razorpay's `order_id` on each recon line already links back to
    //    fetch_all_orders -- this is the "multi-source" join in practice.)
    const ordersResult = await client.callTool({
      name: "fetch_all_orders",
      arguments: { count: 100 },
    });
    const rzpOrders = parseToolResult<{ items: any[] }>(ordersResult).items;

    // --- Reshape into our internal types ---
    const settlementLines: SettlementLine[] = allReconItems.map((item) => ({
      entity_id: item.entity_id,
      type: item.type === "transfer" ? "adjustment" : item.type,
      debit: item.debit,
      credit: item.credit,
      amount: item.amount,
      fee: item.fee,
      tax: item.tax,
      settlement_id: item.settlement_id,
      settlement_utr:
        settlements.find((s) => s.id === item.settlement_id)?.utr ?? "",
      order_id: item.order_id ?? "",
      method: item.method ?? "",
      card_network: item.card_network ?? "",
      settled_at: "", // recon items don't carry their own timestamp
    }));

    const orders: Order[] = rzpOrders.map((o) => ({
      order_id: o.id,
      payment_id: "",
      order_amount: o.amount / 100,
      method: "",
      created_at: new Date(o.created_at * 1000).toISOString(),
      status: o.status,
    }));

    const bankRows: BankRow[] = settlements.map((s) => ({
      bank_txn_id: s.id,
      utr: s.utr,
      credited_amount: s.amount / 100,
      value_date: "",
    }));

    return { orders, settlementLines, bankRows };
  } finally {
    // Always close the connection, even if a call above throws -- otherwise
    // the underlying HTTP/SSE connection can leak across serverless
    // invocations.
    await client.close();
  }
}

// The MCP SDK returns tool results as a content array (usually one text
// block containing JSON), not a plain object -- this helper does the
// unwrap-and-parse step once instead of repeating it at every call site.
function parseToolResult<T>(result: unknown): T {
  const r = result as { content?: { type: string; text?: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock?.text) {
    throw new Error("Unexpected MCP tool result shape: " + JSON.stringify(result));
  }
  return JSON.parse(textBlock.text) as T;
}
