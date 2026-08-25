# Settlement Unpacker (Next.js)

**Razorpay AI Buildathon · Track 04 — AI Finance Controller**

Order-level reconciliation for Razorpay's lumped net settlements. Explodes
each settlement batch back to individual orders, classifies every deduction
(fee, tax, refund, rounding, duplicate, or genuinely unexplained), and
reports match rate, claimable GST input tax credit, and a full confidence-
scored exception audit trail. See the root project's `README.md` for the
full problem statement and why this direction was chosen over the obvious
generic reconciliation demo.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
```

Runs on synthetic data by default — realistic, schema-accurate, and
deliberately messy (duplicate settlements, pending orders, rounding dust,
genuinely unexplained gaps) so the reported match rate is honest, not
cherry-picked.

## AI-reasoned exception classification (the part that makes this an AI agent)

Every exception the deterministic rule engine can confidently classify
(a refund that matches a real order, sub-rupee rounding dust) is handled by
fast, cheap rules — no LLM call needed, matching how a real reviewer would
triage. But every exception the rules are genuinely unsure about
(confidence < 0.6 — the ambiguous `UNEXPLAINED` cases) gets sent to Claude
with the surrounding batch context (nearby order amounts, batch totals) and
re-reasoned properly: a real judgment call about what likely happened, with
its own confidence and a plain-language explanation, not a hardcoded
message.

To enable it:
1. `cp .env.local.example .env.local`
2. Get a key from https://console.anthropic.com
3. `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local`
4. `npm run dev`

Without a key set, the app still runs perfectly — low-confidence exceptions
just keep their original rule-based guess, and the dashboard tags them
"Rule-matched" instead of "AI-reasoned" so it's always visually honest about
which exceptions actually got real judgment applied. This distinction (the
`ai_reasoned` badge on each exception row, and the "Exceptions reasoned by
AI" ledger line in the stats) is deliberate — it's the concrete, checkable
answer to "where did you actually use AI judgment," not just a claim in the
README.

## Live data via Razorpay's MCP server

To pull real test-mode settlement data instead, via Razorpay's official MCP
server (`https://mcp.razorpay.com/mcp`):

1. `cp .env.local.example .env.local`
2. Get test-mode keys: Razorpay Dashboard → Settings → API Keys → Generate
   Test Key (use the `rzp_test_` keys, never live/production ones).
3. Fill in `.env.local`:
   ```
   RAZORPAY_LIVE_MODE=true
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. `npm run dev`

The swap happens in exactly one file (`src/lib/dataSource.ts`) — the
reconciliation engine, API route, and dashboard are all unaware whether data
came from `generateData()` (synthetic) or `fetchLiveSettlementData()` (the
MCP client in `src/lib/liveData.ts`), because both return the identical
`GeneratedData` shape.

**Honesty note:** this integration is written and type-checked but has not
been executed against a live Razorpay account — the sandbox it was built in
can't reach `mcp.razorpay.com`. Test it with your own keys before the demo.
If a tool name or response shape has drifted from what's coded here (MCP
tool schemas do change), the failed call's error message will tell you
exactly what came back, which is the fastest way to patch `liveData.ts`.

## Architecture

A 5-page dashboard with a persistent sidebar, not a single scrolling page —
Overview, Reconciliation Log, Settlements, Tax & GST, and a Data Source
settings page, each a real Next.js route sharing one shell.

```
src/
  lib/
    types.ts          ← shared data model (SettlementLine, Order, Report, ...)
    generateData.ts   ← synthetic data generator, schema-matched to Razorpay's
                         real Settlement Recon API, seeded PRNG for reproducibility
    liveData.ts        ← MCP client: connects to Razorpay's remote MCP server,
                         calls fetch_all_settlements / recon / fetch_all_orders,
                         reshapes the response into the same GeneratedData type
    dataSource.ts      ← the ONE swap point: synthetic vs. live, based on
                         RAZORPAY_LIVE_MODE
    reconcile.ts        ← the agent: duplicate detection, batch-level matching,
                         exception classification, GST ITC calculation. Also
                         exports groupLinesBySettlement/batchGrossTotal so
                         batchSummary.ts can reuse the same arithmetic.
    batchSummary.ts     ← per-settlement-batch view (UTR, bank credit vs.
                         lines total, order count) for the Settlements page
    getReport.ts        ← the ONE place every route fetches report data from;
                         wraps the pipeline in unstable_cache so 5 sidebar
                         routes share one run instead of each re-triggering
                         Claude/MCP calls on navigation
    envStatus.ts        ← live/synthetic + which API keys are configured,
                         booleans only, never actual secret values
    categoryMeta.ts     ← shared color/label config for exception categories

  app/
    (dashboard)/layout.tsx        ← sidebar + top bar shell wrapping all 5 pages
    (dashboard)/page.tsx           ← Overview
    (dashboard)/reconciliation/    ← full exception audit trail
    (dashboard)/settlements/       ← per-batch view + bank-credit trend chart
    (dashboard)/tax/               ← GST ITC claimable vs. at-risk
    (dashboard)/settings/          ← data source status + cache refresh
    api/report/route.ts            ← same pipeline exposed as a JSON API endpoint

  components/
    nav/Sidebar.tsx, nav/TopBar.tsx   ← route nav + live/synthetic indicator
    charts/                            ← D3-based: CategoryBreakdownChart,
                                          SettlementTrendChart, BatchDumbbellChart,
                                          GstMeter, ChartTooltip
    three/AmbientMesh.tsx              ← decorative-only backdrop on Overview;
                                          takes zero props from Report data
    HeroReceipt.tsx, LedgerStats.tsx, ExceptionRow.tsx  ← kept from the
                                          original single-page version
```

**Data flow:** `dataSource.ts` → (`generateData.ts` or `liveData.ts`) →
`reconcile.ts` (`SettlementUnpacker`) → `Report` object, all behind the cached
`getReport()` → each dashboard page. Every layer only depends on the type
contracts in `types.ts`, which is what makes the live-data swap a one-file
change instead of a rewrite.

**Palette:** re-grounded in Razorpay's own brand navy/blues (web-verified hex
values) instead of the original amber accent. Categorical and status colors
were run through a colorblind-safety validator (OKLCH lightness band, chroma
floor, CVD ΔE separation under simulated protanopia/deuteranopia, contrast vs.
the actual navy chart surface) before being adopted — not eyeballed.

## What broke, and how we got out

Two real bugs surfaced by actually running this, not just writing it:

1. **Double-flagging the same rupee.** The batch-level "does the bank credit
   match the settlement lines" check was comparing against a total that had
   already excluded a detected duplicate settlement — so the same money got
   reported as both `DUPLICATE` and a separate `UNEXPLAINED` gap. Fixed by
   making the batch check sum *all* lines (since the bank genuinely received
   that money) and only flag a *new* gap if one remains after the duplicate
   is already accounted for.
2. **A seeded-PRNG scoping bug specific to the JS port.** The random
   generator was instantiated once at module load, so its internal state
   kept drifting across every subsequent call — `page.tsx` and
   `/api/report` showed different totals from the *same* seed, defeating
   the whole point of seeding it. Fixed by creating a fresh PRNG instance
   inside `generateData()` on every call, so seed 42 always reproduces the
   exact same dataset.
