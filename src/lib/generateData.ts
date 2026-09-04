import type { SettlementLine, Order, BankRow } from "./types";

// --- Seeded PRNG -----------------------------------------------------------
// JavaScript's Math.random() has NO seed parameter -- every run gives
// different numbers, which would make our "demo" data different every time
// you refresh the page. Mulberry32 is a small, fast, well-known algorithm
// that turns one integer "seed" into a repeatable sequence of pseudo-random
// numbers between 0 and 1, just like Python's random.seed(42) did.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// IMPORTANT: `rand` must be created FRESH inside generateData(), not once
// at module scope. A module-level PRNG keeps its internal state across every
// call for as long as the Node.js process stays alive (module instances are
// cached and reused, not re-run per request) -- so a top-level `const rand =
// mulberry32(42)` would silently produce different numbers on the 2nd, 3rd,
// ...Nth call even though the seed is always "42". That bug is exactly why
// this app's first version showed different totals on the page vs. the
// /api/report endpoint: two different call sites, two different points in
// the same drifting sequence. Passing a fresh PRNG instance through every
// helper below guarantees the same seed always reproduces the same dataset.
function makeHelpers(rand: () => number) {
  function randFloat(min: number, max: number) {
    return min + rand() * (max - min);
  }
  function randInt(min: number, max: number) {
    return Math.floor(randFloat(min, max + 1));
  }
  function choice<T>(arr: T[]): T {
    return arr[Math.floor(rand() * arr.length)];
  }
  function randId(prefix: string, n = 14) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < n; i++) s += choice(chars.split(""));
    return `${prefix}_${s}`;
  }
  return { randFloat, randInt, choice, randId };
}

function paise(rupees: number) {
  return Math.round(rupees * 100);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const METHODS = ["upi", "card", "netbanking", "wallet"];
const CARD_NETWORKS = ["Visa", "MasterCard", "RuPay", "Amex"];
const MDR_RATE = 0.02;
const GST_ON_MDR = 0.18;
const N_ORDERS = 65;

export interface GeneratedData {
  orders: Order[];
  settlementLines: SettlementLine[];
  bankRows: BankRow[];
}

export function generateData(): GeneratedData {
  const rand = mulberry32(42);
  const { randFloat, randInt, choice, randId } = makeHelpers(rand);

  const orders: Order[] = [];
  const settlementLines: SettlementLine[] = [];

  const batchDate = new Date("2026-08-01T00:00:00");
  const batchSizeTarget = 12;
  let orderIdx = 0;
  let batchNum = 1;

  while (orderIdx < N_ORDERS) {
    const batchId = randId("setl");
    const batchUtr = String(randInt(100000000000, 999999999999));
    const settleDate = new Date(batchDate);
    settleDate.setDate(settleDate.getDate() + choice([1, 2]));

    let thisBatchSize = Math.min(
      batchSizeTarget + randInt(-3, 3),
      N_ORDERS - orderIdx
    );
    thisBatchSize = Math.max(thisBatchSize, 1);

    const batchOrders: { orderId: string; gross: number }[] = [];

    for (let i = 0; i < thisBatchSize; i++) {
      orderIdx++;
      const orderId = randId("order");
      const paymentId = randId("pay");
      const gross = round2(randFloat(299, 8999));
      const method = choice(METHODS);
      const network = method === "card" ? choice(CARD_NETWORKS) : "";

      const fee = round2(gross * MDR_RATE);
      const taxOnFee = round2(fee * GST_ON_MDR);
      const net = round2(gross - fee - taxOnFee);

      orders.push({
        order_id: orderId,
        payment_id: paymentId,
        order_amount: gross,
        method,
        created_at: batchDate.toISOString().slice(0, 16).replace("T", " "),
        status: "paid",
      });

      settlementLines.push({
        entity_id: paymentId,
        type: "payment",
        debit: 0,
        credit: paise(net),
        amount: paise(gross),
        fee: paise(fee),
        tax: paise(taxOnFee),
        settlement_id: batchId,
        settlement_utr: batchUtr,
        order_id: orderId,
        method,
        card_network: network,
        settled_at: settleDate.toISOString().slice(0, 16).replace("T", " "),
      });

      batchOrders.push({ orderId, gross });
    }

    // Seed a partial refund within the batch
    if (batchOrders.length > 3) {
      const refundOrder = choice(batchOrders);
      const refundAmt = round2(refundOrder.gross * randFloat(0.2, 0.6));
      settlementLines.push({
        entity_id: randId("rfnd"),
        type: "refund",
        debit: paise(refundAmt),
        credit: 0,
        amount: paise(refundAmt),
        fee: 0,
        tax: 0,
        settlement_id: batchId,
        settlement_utr: batchUtr,
        order_id: refundOrder.orderId,
        method: "refund",
        card_network: "",
        settled_at: settleDate.toISOString().slice(0, 16).replace("T", " "),
      });
    }

    // Rounding dust
    if (rand() < 0.4) {
      const dust = round2(randFloat(0.01, 0.5));
      settlementLines.push({
        entity_id: randId("adj", 10),
        type: "adjustment",
        debit: paise(dust),
        credit: 0,
        amount: paise(dust),
        fee: 0,
        tax: 0,
        settlement_id: batchId,
        settlement_utr: batchUtr,
        order_id: "",
        method: "",
        card_network: "",
        settled_at: settleDate.toISOString().slice(0, 16).replace("T", " "),
      });
    }

    // Genuinely unexplained deduction, every 3rd batch
    if (batchNum % 3 === 0) {
      const mystery = round2(randFloat(15, 150));
      settlementLines.push({
        entity_id: randId("misc", 10),
        type: "adjustment",
        debit: paise(mystery),
        credit: 0,
        amount: paise(mystery),
        fee: 0,
        tax: 0,
        settlement_id: batchId,
        settlement_utr: batchUtr,
        order_id: "",
        method: "",
        card_network: "",
        settled_at: settleDate.toISOString().slice(0, 16).replace("T", " "),
      });
    }

    batchDate.setDate(batchDate.getDate() + 1);
    batchNum++;
  }

  // Duplicate settlement line -- an EXACT duplicate (same order, same
  // amount, same batch). This is the case the old exact-fingerprint
  // detectDuplicates() logic was built for, and still the easy case for the
  // new probabilistic scoring too (it scores ~1.0).
  const dupSource = choice(settlementLines.slice(0, 20));
  settlementLines.push({ ...dupSource, entity_id: randId("pay") });

  // A "soft" duplicate -- the same order resubmitted ~40 hours later for a
  // noticeably different amount (a partial resubmission, not a byte-for-
  // byte copy). The old exact-match logic could never have caught this: the
  // amount and timestamp both differ. It exists specifically so the new
  // Fellegi-Sunter-style weighted scoring in reconcile.ts has a genuine
  // case to catch that the previous version would have silently missed --
  // scores ~0.76 (order+method match fully, amount and timing partially),
  // landing in the "flag for review, route to Claude" band rather than the
  // "confident enough to auto-exclude from revenue" band.
  const softDupSource = choice(
    settlementLines.filter((l) => l.type === "payment").slice(0, 20)
  );
  const softDupCredit = Math.round(softDupSource.credit * 0.62);
  const softDupSettled = new Date(softDupSource.settled_at.replace(" ", "T"));
  softDupSettled.setHours(softDupSettled.getHours() + 40);
  settlementLines.push({
    ...softDupSource,
    entity_id: randId("pay"),
    credit: softDupCredit,
    amount: softDupCredit,
    settled_at: softDupSettled.toISOString().slice(0, 16).replace("T", " "),
  });

  // A few orders still pending settlement (never appear in settlement lines)
  for (let i = 0; i < 3; i++) {
    const orderId = randId("order");
    const paymentId = randId("pay");
    const gross = round2(randFloat(299, 8999));
    orders.push({
      order_id: orderId,
      payment_id: paymentId,
      order_amount: gross,
      method: choice(METHODS),
      created_at: batchDate.toISOString().slice(0, 16).replace("T", " "),
      status: "paid",
    });
  }

  // A settlement line referencing an order that doesn't exist in the ledger
  const ghost = { ...choice(settlementLines.slice(0, 20)) };
  ghost.entity_id = randId("pay");
  ghost.order_id = randId("order");
  settlementLines.push(ghost);

  // Bank statement: one lumped credit per UTR
  const byUtr = new Map<string, { credit: number; debit: number; date: string }>();
  for (const line of settlementLines) {
    const agg = byUtr.get(line.settlement_utr) ?? {
      credit: 0,
      debit: 0,
      date: line.settled_at,
    };
    agg.credit += line.credit;
    agg.debit += line.debit;
    byUtr.set(line.settlement_utr, agg);
  }

  const bankRows: BankRow[] = [];
  for (const [utr, agg] of byUtr.entries()) {
    bankRows.push({
      bank_txn_id: randId("bnk", 12),
      utr,
      credited_amount: round2((agg.credit - agg.debit) / 100),
      value_date: agg.date.split(" ")[0],
    });
  }

  return { orders, settlementLines, bankRows };
}
