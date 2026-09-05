import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { SettlementLine, Order, BankRow } from "./types";
import type { GeneratedData } from "./generateData";

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

interface RazorpaySettlement {
  id: string;
  amount: number;
  fees: number;
  tax: number;
  utr: string;
  status: string;
}

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

export async function fetchLiveSettlementData(): Promise<GeneratedData> {
  const client = await connectClient();

  try {

    const settlementsResult = await client.callTool({
      name: "fetch_all_settlements",
      arguments: { count: 100 },
    });
    const settlements = parseToolResult<{ items: RazorpaySettlement[] }>(
      settlementsResult
    ).items;

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

    const ordersResult = await client.callTool({
      name: "fetch_all_orders",
      arguments: { count: 100 },
    });
    const rzpOrders = parseToolResult<{ items: any[] }>(ordersResult).items;

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
      settled_at: "",
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

    await client.close();
  }
}

function parseToolResult<T>(result: unknown): T {
  const r = result as { content?: { type: string; text?: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock?.text) {
    throw new Error("Unexpected MCP tool result shape: " + JSON.stringify(result));
  }
  return JSON.parse(textBlock.text) as T;
}
