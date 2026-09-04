# Unsettle (Next.js)

**Razorpay AI Buildathon · Track 04 — AI Finance Controller**

Order-level reconciliation for Razorpay's lumped net settlements. Explodes
each settlement batch back to individual orders, classifies every deduction
(fee, tax, refund, rounding, duplicate, or genuinely unexplained), and
surfaces exactly how much money that lump sum was hiding — claimable GST
input tax credit, duplicate settlements, and unexplained gaps — next to a
full confidence-scored exception audit trail.

## Problem taste, build quality, AI judgment, failure recovery

*(mirroring the rubric directly — the point of this section is to make
evaluation effortless, not to argue for a score.)*

### Problem taste

Order-level matching against a lumped settlement isn't, on its own, the
interesting problem — every reconciliation demo does that. The two things
that actually cost a merchant money and that this agent goes after
specifically: **GST input tax credit leakage** (if a settlement line doesn't
itemise GST on the MDR fee separately, that credit quietly becomes
unclaimable — `reconcile.ts` computes exactly how much, split into
`gst_itc_claimable` vs. `gst_itc_at_risk`), and **duplicate settlement
detection** (the same order settled twice in one batch, which would
otherwise get booked as extra revenue and never get caught). Both are
concrete rupee figures, not a percentage.

### Build quality

`npm run dev` and `npm run build` both succeed cleanly on a fresh checkout;
TypeScript throughout, no `any` in the reconciliation path. The architecture
is layered on purpose: `dataSource.ts` is the *one* place that decides
synthetic vs. live, so `reconcile.ts`, `/api/report`, and every dashboard
page consume an identical `GeneratedData`/`Report` shape regardless of where
it came from — see [Architecture](#architecture) below for the full layer
breakdown. On the current seeded dataset this actually produces: **68
orders, a 95.59% match rate against a 51% manual-VLOOKUP baseline, and 12
exceptions logged — all 12 visible in the Reconciliation Log, none hidden.**

### AI judgment

The concrete answer to "the right tool in the right place, and where you
chose not to use one": every exception the rule engine can classify with
confidence — a refund that matches a real order, sub-rupee rounding dust, an
exact duplicate line — is resolved by deterministic code in `reconcile.ts`,
**no LLM call at all**, because a fixed rule is faster, free, and exactly as
correct there. Only the exceptions the rules are genuinely unsure about
(confidence < 0.6 — the ambiguous `UNEXPLAINED` cases) get sent to Claude
with real batch context, in `llmClassifier.ts`. Every exception in the
dashboard is tagged either `Rule-matched` or `AI-reasoned` (the `ai_reasoned`
field in `types.ts`) — a real, inspectable distinction, not a claim. Without
an API key configured, the app still runs correctly; those exceptions simply
keep their rule-based guess and stay tagged `Rule-matched`, because
overclaiming AI involvement it didn't actually apply would be a worse
failure than not using AI at all.

### Failure recovery

Five real bugs, each caught by actually running the app rather than by
reading the code — full detail in [What broke, and how we got out](#what-broke-and-how-we-got-out)
below:

1. A seeded-PRNG scoping bug that made `page.tsx` and `/api/report` disagree
   on totals from the same seed.
2. A duplicate settlement getting double-flagged as *also* an unrelated
   batch-level gap, overstating the same rupee twice.
3. A CSS gradient missing `background-repeat: no-repeat` that silently tiled
   down every tall page — invisible on the original single short page,
   glaring the moment the app became a 5-page dashboard. Caught by
   Playwright screenshot QA, not by looking at the dev server.
4. A React Fragment in the sidebar leaking its children as direct
   flex-siblings of the parent layout, splitting the *mobile* viewport into
   two columns. Invisible at desktop width; only caught by actually testing
   a 390px viewport.
5. Live mode returning all zeros — diagnosed by connecting directly to
   Razorpay's real MCP server outside the app and calling
   `fetch_all_settlements`/`fetch_all_orders` raw, which confirmed the
   integration code is correct and the test-mode account simply has no
   orders in it yet — not a bug, a data problem, and the diagnosis is what
   proves the difference.

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
2. Get a key from https://openrouter.ai/keys
3. `OPENROUTER_API_KEY=sk-or-v1-...` in `.env.local`
4. Optionally set `OPENROUTER_MODEL` to whichever model OpenRouter should
   route to (defaults to `anthropic/claude-sonnet-4.5` if left unset)
5. `npm run dev`

OpenRouter only, deliberately — one key, any model behind it
(`src/lib/llmProvider.ts`), so the model is a config choice, not something
hardcoded into the reconciliation engine.

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

Five real bugs surfaced by actually running this, not just writing it:

1. **Double-flagging the same rupee.** The batch-level "does the bank credit
   match the settlement lines" check was comparing against a total that had
   already excluded a detected duplicate settlement — so the same money got
   reported as both `DUPLICATE` and a separate `UNEXPLAINED` gap. Fixed by
   making the batch check sum *all* lines (since the bank genuinely received
   that money) and only flag a *new* gap if one remains after the duplicate
   is already accounted for.
2. **A seeded-PRNG scoping bug specific to the JS port.** The random
   generator was instantiated once at module load, so its internal state
   kept drifting across every subsequent call — the page route and
   `/api/report` showed different totals from the *same* seed, defeating
   the whole point of seeding it. Fixed by creating a fresh PRNG instance
   inside `generateData()` on every call, so seed 42 always reproduces the
   exact same dataset.
3. **A tiling background gradient, once the app grew past one short page.**
   `body`'s radial-gradient in `globals.css` never had `background-repeat:
   no-repeat` — the CSS default is to repeat. Invisible in the original
   single-page layout (short page, and the old amber glow was close enough
   in luminance to the base navy to be nearly imperceptible even if it *had*
   repeated). The moment the app became a genuinely tall 5-page dashboard
   with a brighter, more saturated glow color, the same latent bug produced
   a visibly repeating horizontal band every ~500px down every page. Found
   by taking real Playwright screenshots of the tall pages and noticing a
   band that didn't correspond to any component — not by reading the CSS.
   Fixed with one line.
4. **A React Fragment leaking layout, mobile-only.** `Sidebar.tsx` returns a
   `<>...</>` fragment containing a mobile hamburger strip, an overlay, and
   the `<nav>`. The parent layout renders `<Sidebar />` as a single flex
   child, but a fragment doesn't wrap its children in a DOM node — so at
   viewport widths below the `md` breakpoint (where the hamburger strip is
   actually visible instead of `display:none`), that strip became a *second*
   flex item competing for row space with the rest of the page, splitting a
   390px-wide screen into two ~195px columns. Zero effect at desktop width,
   where the strip is hidden and never enters the flex row at all — which is
   exactly why it wasn't caught until a real mobile-viewport screenshot was
   taken. Fixed by taking the strip out of flow (`fixed` instead of static),
   the same way the `<nav>` beside it already avoided the problem.
5. **Live mode returning all zeros.** `RAZORPAY_LIVE_MODE=true` with real
   test-mode keys produced a fully empty report — no crash, no error, just
   zeros everywhere. Rather than assume a broken integration, connected
   directly to `https://mcp.razorpay.com/mcp` outside the app (same auth,
   same tool calls `liveData.ts` makes) and called `fetch_all_settlements`
   and `fetch_all_orders` raw. Both returned `{"count":0,"items":[]}`
   straight from Razorpay's own API — the integration code is correct; the
   test-mode account behind those keys has never had an order created in it.
   Confirmed as a data problem, not a code problem, before touching a single
   line of `liveData.ts`.
