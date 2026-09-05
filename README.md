# Unsettle (Next.js)

**Razorpay AI Buildathon · Track 04 — AI Finance Controller**

Order-level reconciliation for Razorpay's lumped net settlements. Explodes
each settlement batch back to individual orders, classifies every deduction
(fee, tax, refund, rounding, duplicate, or genuinely unexplained), and
surfaces exactly how much money that lump sum was hiding — claimable GST
input tax credit, duplicate settlements, and unexplained gaps — next to a
full confidence-scored exception audit trail. Every user signs in with
Google and gets their own persisted reconciliation history, not a shared
demo dataset.

## Problem taste, build quality, AI judgment, failure recovery

*(mirroring the rubric directly — the point of this section is to make
evaluation effortless, not to argue for a score.)*

### Problem taste

Order-level matching against a lumped settlement isn't, on its own, the
interesting problem — every reconciliation demo does that. The things that
actually cost a merchant money, and that this agent goes after specifically:

- **GST input tax credit leakage** — if a settlement line doesn't itemise
  GST on the MDR fee separately, that credit quietly becomes unclaimable.
  `reconcile.ts` computes exactly how much, split into `gst_itc_claimable`
  vs. `gst_itc_at_risk`.
- **Duplicate settlements, including the ones exact-match logic misses** —
  the same order settled twice for the exact same amount is the easy case.
  A resubmitted payment at a *different* amount or time is the case most
  reconciliation tools silently miss entirely — see
  [Duplicate detection](#duplicate-detection-probabilistic-not-exact-match)
  below.
- **A synthesized "what to do next" list**, not just a wall of stat lines —
  see [Recommendations](#recommendations).

All of it comes out as concrete rupee figures, not percentages.

### Build quality

`npm run dev`, `npm run build`, and `npm test` all succeed cleanly on a
fresh checkout; TypeScript throughout, no `any` in the reconciliation path.
The architecture is layered on purpose: `dataSource.ts` is the *one* place
that decides synthetic vs. live Razorpay data, so `reconcile.ts`,
`/api/report`, and every dashboard page consume an identical
`GeneratedData`/`Report` shape regardless of where it came from — see
[Architecture](#architecture) for the full layer breakdown. On the current
seeded dataset (68 orders, 6 settlement batches — comfortably past the
track's 50+ record minimum, and deterministic, so it's the same 68 records
every run, not randomized per demo) this produces a **95.59% match rate
against a 51% manual-VLOOKUP baseline, and 12–13 exceptions logged — every
one visible in the Reconciliation Log, none hidden.**

**32 automated tests, `npm test`**, across 7 files — including regression
tests for two real bugs found while building this (see
[Failure recovery](#failure-recovery)), and tests for the duplicate-scoring,
confidence-calibration, Benford's Law, and AI-verification logic
specifically. Run it live as proof, not a claim.

### AI judgment

The concrete answer to "the right tool in the right place, and where you
chose not to use one": every exception the rule engine can classify with
confidence — a refund that matches a real order, sub-rupee rounding dust, an
exact duplicate line — is resolved by deterministic code in `reconcile.ts`,
**no LLM call at all**, because a fixed rule is faster, free, and exactly as
correct there. Only the exceptions the rules are genuinely unsure about
(confidence < 0.6) get sent to an LLM via OpenRouter with real batch
context, in `llmClassifier.ts`. Every exception in the dashboard is tagged
`Rule-matched`, `AI-reasoned`, or `AI rejected — rule kept` — a real,
inspectable distinction, not a claim.

**The AI doesn't get trusted just because it responded.**
`verifyReasonedResult()` independently checks every reasoned result before
accepting it: the category must be one of the four this system actually
recognizes, confidence must be a real 0–1 number, and the explanation can't
name an order that doesn't exist in the merchant's own ledger. A result that
fails any check is discarded — the rule-based guess is kept instead — and
the exception is tagged `verification_failed: true` with the specific
rejection reason attached (`verification_failure_reason`), surfaced
plainly on the Reconciliation Log. This isn't theoretical: during testing,
a real OpenRouter/Claude call was rejected for referencing an order the
rule engine had flagged as nonexistent — logged, with the exact reason,
and the rule-based classification was kept automatically.

Without an API key configured, the app still runs correctly; those
exceptions simply keep their rule-based guess, because overclaiming AI
involvement it didn't actually apply would be a worse failure than not
using AI at all.

### Failure recovery

Five real bugs, each caught by actually running the app rather than by
reading the code — full detail in
[What broke, and how we got out](#what-broke-and-how-we-got-out):

1. A seeded-PRNG scoping bug that made two call sites disagree on totals
   from the same seed.
2. A duplicate settlement getting double-flagged as *also* an unrelated
   batch-level gap, overstating the same rupee twice.
3. A CSS gradient missing `background-repeat: no-repeat` that silently
   tiled down every tall page once the app grew past one short screen.
4. A React Fragment in the sidebar leaking its children as direct
   flex-siblings of the parent layout, splitting the *mobile* viewport into
   two columns — invisible at desktop width.
5. Live mode returning all zeros — diagnosed by connecting directly to
   Razorpay's real MCP server outside the app, which confirmed the
   integration code is correct and the test-mode account simply had no
   orders in it yet.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # 32 tests, 7 files
```

Runs on synthetic data by default — realistic, schema-accurate, and
deliberately messy (duplicate settlements, pending orders, rounding dust,
genuinely unexplained gaps) so the reported match rate is honest, not
cherry-picked.

## Authentication & per-user storage

Every user signs in with Google (via Supabase Auth) and gets their own
reconciliation history — this is not a shared demo dataset everyone sees
the same copy of. On first sign-in, the full pipeline runs once and is
saved as a row the user owns; every visit after reads that saved run
instead of recomputing. A **"Run reconciliation again"** action on the
Data Source page computes a fresh run and saves it as a *new* row,
preserving history rather than overwriting it.

- **Google OAuth** via Supabase Auth — `src/app/login/page.tsx`,
  `src/app/auth/callback/route.ts`.
- **Postgres + Row Level Security** — two tables (`reconciliation_runs`,
  `chat_messages`, schema in `supabase/schema.sql`), every policy keyed off
  `auth.uid()`, so the same `anon` public key is safe client- and
  server-side. There is no `service_role` key anywhere in this app.
- **`src/proxy.ts`** (not `middleware.ts` — this Next.js version renamed
  the convention) keeps the session cookie fresh; `src/app/app/layout.tsx`
  and `src/app/api/chat/route.ts` both independently check for a signed-in
  user, since a Route Handler is a separate request path a layout redirect
  doesn't cover.

Setup steps (Supabase project, Google Cloud OAuth client, env vars) are in
`.env.local.example`.

## AI-reasoned exception classification

Every exception the deterministic rule engine can confidently classify is
handled by fast, cheap rules — no LLM call needed. Every exception the
rules are genuinely unsure about (confidence < 0.6) gets sent to an LLM via
OpenRouter with the surrounding batch context (nearby order amounts, batch
totals) and re-reasoned properly, then independently verified (see
[AI judgment](#ai-judgment) above) before being trusted.

To enable it:
1. `cp .env.local.example .env.local`
2. Get a key from https://openrouter.ai/keys
3. `OPENROUTER_API_KEY=sk-or-v1-...` in `.env.local`
4. Optionally set `OPENROUTER_MODEL` to whichever model OpenRouter should
   route to — any paid or free model it supports (defaults to
   `minimax/minimax-m3:free`, a free-tier model, if left unset)
5. `npm run dev`

OpenRouter only, deliberately — one key, any model behind it
(`src/lib/llmProvider.ts`), so the model is a config choice, not something
hardcoded into the reconciliation engine.

**Safety boundary.** This agent classifies, explains, and suggests a next
action — it never auto-corrects the books, never auto-files anything with
Razorpay or a tax authority, and never silently resolves a low-confidence
exception without a human (or a verified AI judgment call) in the loop.

## Duplicate detection: probabilistic, not exact-match

`reconcile.ts` scores every candidate duplicate pair with a weighted
formula across order match, amount closeness, time proximity, and payment
method — the same conceptual approach as Fellegi-Sunter probabilistic
record linkage (1969), still the basis of modern entity-resolution tools
like Splink. Two bands:

- **Score ≥ 0.92** — confident enough to exclude from revenue automatically
  (the exact-match case: same order, same amount, same batch).
- **Score 0.65–0.92** — flagged as a "possible duplicate" and routed
  through the AI-reasoning + verification pipeline instead of either being
  silently missed (what exact-match logic would do) or auto-removed from
  revenue on suspicion alone. `duplicateMatchScore()` is exported and
  directly unit-tested against both an exact-fingerprint case and a soft
  case (same order, ~38% different amount, 40 hours apart) that exact
  matching would never catch.

## Calibrated confidence scores

Every exception's confidence is a computed weighted fusion of four
signals — whether an order reference resolves, how well the amount matches
a recognized pattern, the amount's size relative to its batch, and whether
a similar pattern recurs elsewhere in the report — not a hand-picked
literal. `computeConfidence()` in `reconcile.ts` weights them
35/30/20/15 (order match / amount strength / inverse batch impact /
temporal consistency); order-less categories (rounding dust, batch-level
gaps) simply don't carry the order-match signal rather than being
penalized for lacking a reference that was never expected in the first
place.

## Benford's Law check

`benfordCheck.ts` runs a first-digit chi-square test against Benford's
expected distribution across all `UNEXPLAINED` amounts — a real
forensic-accounting technique for spotting a systematic pattern rather than
independent random noise. Honestly gated on sample size: below ~50 data
points (this app's actual synthetic dataset included) it refuses to call a
verdict either way rather than show a falsely confident pass/fail, and says
so plainly in the UI (`BenfordNote.tsx`). Implemented and functional, most
meaningful at production scale with a full settlement history.

## Recommendations

`recommendations.ts` synthesizes the report's real numbers — GST credit at
risk, duplicate settlements found, low-confidence exceptions, orders not
yet in any settlement — into a ranked "what to do next" list on the
Overview page. Every line is computed from data the app already produced;
nothing here is generic financial-advice filler.

## Ask AI

A grounded Q&A chat, its own page in the sidebar
(`src/app/app/chat/page.tsx`), backed by `src/lib/qaAgent.ts`. This is
**structured retrieval, not vector RAG** — the dataset is small and fully
structured, so retrieval means pulling the exact records a question is
about (by order ID, category, GST keyword, or a highest-value fallback) and
handing exactly those to the LLM with an instruction to answer only from
what it was given. Chat history persists per user in Postgres.

## Live data via Razorpay's MCP server

**Real Razorpay settlement data can be linked into this directly** — the
whole app is built so that swapping synthetic data for a live Razorpay
account is a config change, not a rewrite:

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
MCP client in `src/lib/liveData.ts`, connecting to
`https://mcp.razorpay.com/mcp`), because both return the identical
`GeneratedData` shape.

**Honesty note:** this integration is written, type-checked, and verified
reachable (connected directly to Razorpay's real MCP server outside the app
during testing — see [Failure recovery](#failure-recovery) #5), but the
specific test-mode account it was verified against had zero orders in it,
so the end-to-end numbers haven't been seen with real transaction data yet.
Point it at an account with real test transactions and it should just work;
if a tool name or response shape has drifted (MCP tool schemas do change),
the failed call's error message will tell you exactly what came back.

## Architecture

A 6-page dashboard behind a Google sign-in wall, not a single scrolling
page or a shared demo — Overview, Ask AI, Reconciliation Log, Settlements,
Tax & GST, and a Data Source settings page, each a real Next.js route
sharing one shell, plus a separate marketing landing page at `/`.

```
src/
  lib/
    types.ts            ← shared data model (SettlementLine, Order, Report, ...)
    generateData.ts      ← synthetic data generator, schema-matched to Razorpay's
                           real Settlement Recon API, seeded PRNG for reproducibility
    liveData.ts           ← MCP client: connects to Razorpay's remote MCP server
    dataSource.ts         ← the ONE swap point: synthetic vs. live
    reconcile.ts           ← the agent: probabilistic duplicate detection,
                           calibrated confidence, batch matching, GST ITC calculation
    benfordCheck.ts        ← forensic-accounting anomaly check on UNEXPLAINED amounts
    recommendations.ts     ← "what to do next" synthesis from the real report
    llmProvider.ts          ← OpenRouter call + auth, shared by llmClassifier and qaAgent
    llmClassifier.ts        ← sends low-confidence exceptions to the LLM, independently
                           verifies every result before trusting it
    qaAgent.ts              ← structured retrieval + grounded Q&A
    batchSummary.ts          ← per-settlement-batch view for the Settlements page
    getReport.ts              ← cached pipeline accessor every route reads from
    envStatus.ts               ← which providers/keys are configured, booleans only
    supabase/client.ts, server.ts  ← browser/server Supabase clients
    db/runs.ts, chat.ts             ← persistence for reconciliation runs and chat history
    auth/requireUser.ts, actions.ts ← session check + sign-out server action

  app/
    page.tsx                       ← marketing landing page
    login/page.tsx                  ← Google sign-in
    auth/callback/route.ts           ← OAuth code exchange
    proxy.ts                          ← session-cookie refresh (this Next.js
                                        version's renamed middleware.ts)
    app/layout.tsx                    ← sidebar + top bar shell, requires a signed-in user
    app/page.tsx                       ← Overview
    app/chat/                           ← Ask AI
    app/reconciliation/                  ← full exception audit trail
    app/settlements/                      ← per-batch view + bank-credit trend chart
    app/tax/                               ← GST ITC claimable vs. at-risk
    app/settings/                            ← data source status + re-run action
    api/report/route.ts                       ← pipeline as a JSON API endpoint
    api/chat/route.ts                          ← Q&A backend, per-user persisted

  components/
    nav/           ← Sidebar (collapsible, all 6 routes), TopBar, ThemeToggle
    charts/        ← D3-based: CategoryBreakdownChart, SettlementTrendChart,
                     BatchDumbbellChart, GstMeter, ChartTooltip
    chat/          ← ChatPage (the Ask AI page)
    landing/       ← marketing page sections
    three/AmbientMesh.tsx  ← decorative-only backdrop; takes zero props from Report data
```

**Data flow:** `dataSource.ts` → (`generateData.ts` or `liveData.ts`) →
`reconcile.ts` (`SettlementUnpacker`) → `Report` object → saved per-user via
`db/runs.ts` → read back by every dashboard page. Every layer only depends
on the type contracts in `types.ts`.

**Theme:** the dashboard defaults to a light theme (`ThemeToggle.tsx`,
toggle in the sidebar/top bar, persisted to `localStorage`, applied
pre-paint via an inline script in `layout.tsx` so there's no flash of the
wrong theme); dark mode stays available as a real toggle, not a removed
option. Every color is a role-based CSS variable (`--color-text`,
`--color-stamp`, ...) redefined per theme in `globals.css`'s `:root` /
`:root[data-theme="dark"]`, so no component hardcodes a hex. Categorical
and status colors were run through a colorblind-safety validator (OKLCH
lightness band, chroma floor, CVD ΔE separation under simulated
protanopia/deuteranopia, contrast vs. the actual chart surface) for both
themes — not eyeballed. The marketing landing page at `/` keeps its own
fixed dark navy/blue aesthetic (Razorpay's brand hexes) regardless of the
dashboard's theme setting.

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
   kept drifting across every subsequent call — two call sites showed
   different totals from the *same* seed, defeating the whole point of
   seeding it. Fixed by creating a fresh PRNG instance inside
   `generateData()` on every call, so seed 42 always reproduces the exact
   same dataset. Now a permanent regression test (`generateData.test.ts`).
3. **A tiling background gradient, once the app grew past one short page.**
   `body`'s radial-gradient in `globals.css` never had `background-repeat:
   no-repeat` — the CSS default is to repeat. Invisible in the original
   single-page layout; glaring the moment the app became a genuinely tall
   multi-page dashboard. Found by taking real Playwright screenshots and
   noticing a band that didn't correspond to any component. Fixed with one
   line.
4. **A React Fragment leaking layout, mobile-only.** The sidebar returned a
   fragment containing a mobile hamburger strip, an overlay, and the nav.
   The parent layout renders the sidebar as a single flex child, but a
   fragment doesn't wrap its children in a DOM node — so below the `md`
   breakpoint, the strip became a *second* flex item competing for row
   space, splitting a 390px screen into two columns. Zero effect at desktop
   width, where the strip is hidden and never enters the flex row at all —
   only caught by actually testing a mobile viewport. Fixed by taking the
   strip out of flow (`fixed` instead of static).
5. **Live mode returning all zeros.** `RAZORPAY_LIVE_MODE=true` with real
   test-mode keys produced a fully empty report — no crash, no error, just
   zeros everywhere. Rather than assume a broken integration, connected
   directly to `https://mcp.razorpay.com/mcp` outside the app and called
   `fetch_all_settlements`/`fetch_all_orders` raw. Both returned
   `{"count":0,"items":[]}` straight from Razorpay's own API — the
   integration code is correct; the test-mode account behind those keys had
   never had an order created in it. Confirmed as a data problem, not a
   code problem, before touching a single line of `liveData.ts`.
