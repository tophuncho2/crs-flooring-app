# Entity Payments

## Dev Scope

- [ ] Delete contacts and labor payments models all the way through.
- [ ] Add a payments table, used for inflows and outflows, single-entry ledger.
- [ ] Rename management companies to Entities all the way through.
- [ ] Add an `entities type` table; payments and entities both link to it.
- [ ] Add filtering for entities type.
- [ ] Plan user role/status gating based on entity type, or let owner users manually configure which users see which entities or types.
- [x] Backfill manufacturers into the entities table with `manufacturer` type, link entities to imports and products and backfill, then delete the manufacturers model all the way through. (DONE 2026-07-01 — backfill run + verified, model + module fully stripped, migration `20260701120000_drop_manufacturer_model`.)
- [ ] Link payments to work orders; add a `planned payments` table which links to work orders, maybe payments.
- [ ] Add cost and freight columns to inventory, adjustments, and staged inventory rows.
- [ ] Link inventory and imports to the payments table.
- [ ] Add work order job costing:
  - Expenses against a work order = sum of cost / freight columns from linked adjustments and linked outflow payments.
  - Planned payments and/or invoice cost columns = what the customer pays; the inflow added to payments / linked to the order, is what actually matters.

## Notes

- [ ] The user role/status gating will be applied to catalog tables as well.
- [ ] Entities type link should allow multiple types.
- [ ] Planned payments will be linked to templates as well; goes through with the sync.

---

## Design

### Entities & types

- An **entity** carries an **array of types** (manufacturer, management company / customer, etc.) — many-to-many, one entity can play several roles.
- A **payment links to exactly one entity**; the entity's type(s) are a lookup off that entity.
- A **payment has its own type** (its category), separate from the entity's type array. Don't conflate the two — entity-type classifies the party, payment-type classifies the money.

### Money axes — where each dollar lives

There are two distinct axes of money; keeping them separate is what makes the costing tie out.

| Money axis | Lives on | Counts in |
|---|---|---|
| Customer cash (inflow) | payment → work order | WO balance **and** company balance |
| Direct job spend (labor, subs, non-material outflow) | payment → work order | WO balance **and** company balance |
| Material purchase (cash actually paid) | payment → **import / inventory** | company balance only |
| Material consumed by a job (allocation) | adjustment cost/freight | WO costing only |

- **Company running balance** (the strong analytics page) = payments only: Σ inflows − Σ outflows. Adjustment cost **never** enters here — the cash already left at the import.
- **Per-work-order truth** = WO inflows − WO outflows − Σ adjustment landed cost. Cash at the WO plus the allocated material slice.

These two views stay consistent because adjustment cost is an **allocation**, not a ledger entry — it's a slice of an import-level payment that's already counted in the company balance, pushed down onto the job.

### Cost/freight flow (no hand-entry)

Cost/freight columns live on the three modules (inventory, adjustments, staged inventory) but are **derived, not entered**:

1. **Import → staged inventory** — cost/freight carried from the import (what was actually paid).
2. **Staged → inventory** — the materialize-worker job pastes cost/freight from the staged row onto the inventory row it creates.
3. **Inventory → adjustment** — the adjustment derives its cost from qty × type against the inventory it draws from.

So the expense an import/inventory row links to (the payment) is the source of what was *actually paid*; adjustments linked to work orders are **pure job costing**.

### The three rules that must hold

1. **Material outflow payments link to import/inventory, never directly to a work order.** If a material payment is ever WO-linked while the adjustment also carries cost, it double-counts. This is the one guardrail.
2. **Adjustment cost is allocation-only — keep it out of the company running balance.** Company balance = payments only.
3. **Cost/freight flows automatically** (import → staged → inventory → adjustment) at materialization; never hand-entered, or the allocation drifts from the actual payment.

### Plan vs. actual (quote / invoice)

- Template **planned payments** (own table) paste into WO **planned payments** (own table, reused elsewhere — out of scope here) on sync, same path material items take.
- WO planned payments + material items = **the quote / invoice** = what the customer *should* pay (the plan for the job).
- Actual **inflow payments** = what the customer *did* pay. Planned = the plan, inflow = the truth.

### Timing caveat (expected, not a bug)

If an import is bought on terms and not yet paid, the adjustment still allocates cost onto the job before any cash hits the running balance. Normal accrual-vs-cash lag — "sum of all job costs" won't equal "company outflows" at any instant until the import payment lands.
