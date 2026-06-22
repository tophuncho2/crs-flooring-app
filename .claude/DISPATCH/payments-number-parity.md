# payments-number-parity — give the payments module record-number parity (payment# generated int + record-view picker/stepper)

## STOP — plan before you touch anything
You are on a fresh dev-N branch. **Open with `/newsession`** scoped to the payments module + the inventory/work-orders reference patterns below, read every layer end-to-end, confirm the plan, THEN edit. The code is the source of truth — do not trust this brief over what the files actually say.

## Mission
Bring the **payments** module's record number (`paymentNumber`, e.g. `PAY-12`) up to the same setup that inventory, imports, and work-orders already have:
1. a generated **`paymentNumberInt`** column (so payments can be ordered/searched/stepped by number), and
2. a **record-view picker with the engine-enforced prev/next stepper** that flips between payment records by number (`◀ PAY-12 ▶`).

The **amount** search work is NOT in this session — it is a handoff to the next session (see "Handoff" below). Wire payment-number exact-search plumbing this session as the reference modules do; the list-view search **bar surfacing** + the pivot to amount are explicitly next-session.

## Scope
**In:**
- `paymentNumberInt` generated column + index in schema, with a written migration.
- `PaymentNeighbor` + `PaymentDetail` domain types; neighbor resolution in the data layer via the shared `numberNeighborQueries` primitive.
- A `getPaymentDetailById()` (with-neighbors) read path; use case + API + record page wired to return neighbors.
- `RecordStepperPortal` mounted in the payment record-view client, stepping by `paymentNumberInt` neighbors — mirror the inventory/work-orders detail clients.
- Payment-number exact-search **plumbing** (domain filter field → data WHERE clause on `paymentNumberInt` → API validator → list request), mirroring inventory's `invNumber`.

**Out (do not touch):**
- Anything under `modules/inventory`, `modules/adjustments`, `modules/products`, `modules/categories`, or `modules/work-orders` — those are reference-only; read them, never edit them.
- The shared engine (`apps/web/engines/record-view/**`) and `packages/db/src/shared/number-neighbors.ts` — **import** them, do not modify them. If you think the engine needs a change, STOP and raise it; do not edit it here.
- The `amount` column index, the server-side exact-**amount** query, and surfacing the list-view search **bar** — these are the next-session handoff, not this session.

## Files you own (do not edit anything outside this list)
- `packages/db/prisma/schema.prisma` — **only** the `FlooringPayment` model (add `paymentNumberInt` + its `@@index`). No other model.
- `packages/db/prisma/migrations/<new>/migration.sql` — new migration adding the generated column + index.
- `packages/domain/src/flooring/payments/types.ts` — add `paymentNumberInt`, `PaymentNeighbor`, `PaymentDetail`, exact-search filter field on `PaymentListFilters`.
- `packages/domain/src/flooring/payments/index.ts`, `.../list-config.ts` — exports / filter wiring as needed.
- `packages/db/src/flooring/payments/read-repository.ts` — `getPaymentDetailById()` + neighbor lookups + exact `paymentNumberInt` WHERE clause.
- `packages/db/src/flooring/payments/write-repository.ts`, `.../index.ts` — only if the read additions require it.
- `packages/application/src/flooring/payments/get-payment.ts`, `.../list-payments.ts` — return `PaymentDetail` w/ neighbors; thread the payment-number filter.
- `apps/web/app/api/payments/route.ts` — thread the exact-search param.
- `apps/web/app/api/payments/_validators.ts` — **new** file (mirror `apps/web/app/api/inventory/_validators.ts`), exact-number filter validation.
- `apps/web/modules/payments/data/list-payments-request.ts` — parse/build the payment-number search param.
- `apps/web/modules/payments/components/record/payment-detail-client.tsx` — mount `RecordStepperPortal` + stepping.
- `apps/web/modules/payments/controllers/record/**` — new selection/stepping controller if you follow the inventory in-place pattern.
- `apps/web/modules/payments/components/list/table/payments-list-columns.ts` — only if needed for record# cell parity.
- `apps/web/app/dashboard/payments/record/page.tsx` — load detail w/ neighbors, pass to client.

## Layer-by-layer map
- **Schema** — `packages/db/prisma/schema.prisma` `FlooringPayment` (~408-423). Add `paymentNumberInt Int? @default(dbgenerated(...))` extracting digits after the `PAY-` prefix (4 chars → `FROM 5`), plus `@@index([paymentNumberInt])`. Pattern: inventory schema ~209-245, work-orders ~496-521.
- **Migration** — mirror `packages/db/prisma/migrations/20260521170000_inventory_number_int_generated_column/migration.sql`: `GENERATED ALWAYS AS (CAST(SUBSTRING("payment_number" FROM 5) AS INTEGER)) STORED` + a btree index. **Write it; do NOT run it.**
- **Domain** — `packages/domain/src/flooring/payments/types.ts` (1-46): add `paymentNumberInt?: number` to `Payment`; add `PaymentNeighbor` (id; include any field the record page needs to navigate) + `PaymentDetail = Payment & { previousPayment: PaymentNeighbor | null; nextPayment: PaymentNeighbor | null }`; add `paymentNumber?: string` to `PaymentListFilters`. Reference: inventory types 50-64, work-orders types 28-48.
- **Data** — `packages/db/src/flooring/payments/read-repository.ts`: add `getPaymentDetailById()` calling neighbor lookups built on `packages/db/src/shared/number-neighbors.ts` `numberNeighborQueries("paymentNumberInt", n)`; add exact-match clause (strip non-digits → parse int → `equals`, sentinel `-1`). Reference: inventory read-repo 143-170 (neighbors), 214-229 (detail), 422-426 (exact match); work-orders read-repo 92-96, 300-349.
- **Application** — `get-payment.ts`: return `PaymentDetail` w/ neighbors (with a `withNeighbors` escape hatch for create/delete paths). `list-payments.ts`: trim + thread the `paymentNumber` filter. Reference: inventory `list-inventory.ts` 9-24, 50.
- **API** — `route.ts` GET threads the param; new `_validators.ts` mirrors `apps/web/app/api/inventory/_validators.ts` (220-280) for the exact-number filter.
- **Module dir** — `list-payments-request.ts` parse/build (`invNumber` analog at `modules/inventory/data/list-inventory-request.ts` 44-100). `payment-detail-client.tsx` mounts `RecordStepperPortal` (`apps/web/engines/record-view/shell/record-stepper-portal.tsx`); copy the wiring from `modules/inventory/components/record/inventory-detail-client.tsx` 48-96 (in-place via `controllers/record/use-inventory-record-selection.ts`) or `modules/work-orders/components/record/work-order-detail-client.tsx` 18-78 (route-nav). Pick one and say which in your plan.
- **Pages** — `app/dashboard/payments/record/page.tsx`: call the detail use case, pass neighbors to the client.

## Migration (schema changes)
Write the migration under `packages/db/prisma/migrations/`. **DO NOT run it — the user runs all migrations.** Match the `_number_int_generated_column` migrations exactly (generated STORED column + btree index), only swapping the table/column/prefix length.

## Handoff (write this at end of session for the NEXT session)
Produce a handoff brief telling the next session to:
1. Create an **index on the `amount` column** (+ migration, written not run).
2. Fully wire the **server-side query for an exact search of `amount`** (domain filter → data WHERE → API validator → list request), following the same exact-match pattern this session used for `paymentNumberInt`.
3. **Surface the search bar** on the payments list view.
4. If a picker/search query already exists from this session, **repoint its search to the `amount` column's exact search.**

## Done means
- `/check` green (build + typecheck + lint + test).
- Migration written (NOT run).
- Handoff brief written for the next session (amount index + exact-amount query + list search bar + repoint).
- Commit message ≤17 words ready. **DO NOT COMMIT — the user commits.**
