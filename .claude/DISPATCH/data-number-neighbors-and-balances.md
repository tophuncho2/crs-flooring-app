# data-number-neighbors-and-balances — Data-layer: converge the number-neighbor resolver + delete the dead balances cluster

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
This branch converges the 12 duplicated number-neighbor resolver *wrappers* (null-guard → `numberNeighborQueries` → `Promise.all(findFirst × 2)` → map rows to a per-model shape) into one last shared helper in `packages/db/src/shared/`, alongside the already-extracted `numberNeighborQueries` core. It also deletes the dead inventory "balances" cluster — a read function, its type, and the single API route that is its only consumer. "Done" = one shared resolver used by all 12 read-repos + the balances cluster gone end-to-end, gauntlet green.

## ⚑ Flags — decisions to make / potential gaps

**Decisions**
- ⚑ **Helper name / file placement.** Working name `resolveNumberNeighbors`. The `shared/` convention is one-function-per-file, but this wrapper is intimately paired with `numberNeighborQueries` — decide whether to co-locate as a second export in `shared/number-neighbors.ts` or add a new sibling file. (Lean: co-locate, since it composes `numberNeighborQueries` directly.)
- ⚑ **Signature.** Recommended `(field, currentInt, find)` finder-callback generic over row `T` (see Layer map). Decide AGAINST a delegate-generic param unless you find a clean constraint — a delegate param fights Prisma's per-model `findFirst`/`select` typing. Confirm the callback shape.
- ⚑ **Inventory `warehouseId`.** Under the callback approach this needs NO special param — the caller's `select: { id, warehouseId }` rides along in `T` for free. Confirm the branch does NOT add a bespoke `extraSelect`/second-select param.
- ⚑ **What stays at the call site.** Per-repo re-keying (`previousInventory`/`nextInventory`, `previousTemplate`/`nextTemplate`, etc.), the `NO_X_NEIGHBORS` constants, and the local `XNeighbors` return types all stay module-local; the helper returns a generic `{ previous, next }`. Confirm this split.
- ⚑ **Balances type is deleted wholesale, not relocated.** Confirm no consumer wants `InventoryBalances` preserved anywhere.

**Gaps**
- ⚑ **`imports` has no null-guard.** `getImportNeighbors` takes `importNumber: number` (non-null) with no `NO_IMPORT_NEIGHBORS` short-circuit. The shared guard `currentInt: number | null` is a superset and handles it — but don't assume all 12 wrappers share identical scaffolding; read each before converging.
- ⚑ **Work-orders has a SECOND, nested wrapper.** `getWorkOrderNeighborsById` (~:314-320) fetches the row's number then delegates to `getWorkOrderNeighbors`. Only the INNER `getWorkOrderNeighbors:278` is the dedup target — the by-id outer wrapper stays. Do NOT fold it in.
- ⚑ **Field-name variance.** 11 repos pass a `*NumberInt` field; `imports` passes `importNumber`. `<F extends string>` handles it, but `field` is genuinely per-repo — pass it explicitly, don't hardcode.
- ⚑ **Balances route may be dead at the route level too.** No client fetches `/api/inventory/[id]/balances` (only `.next/types` build artifacts + conceptual doc-comments in the inventory adjustments module about reconciling from the mutation RESPONSE, not this endpoint). Deletion looks safe — but sanity-check that the adjustment mutation flow reconciles its balance cells from its OWN response before assuming zero downstream impact.
- ⚑ **No barrel to update for the new helper.** `shared/` has no `index.ts`; read-repos import by explicit `.js` path. Nothing extra to wire.

## Scope
In:
1. Converge the 12 number-neighbor wrapper functions onto one new shared resolver in `packages/db/src/shared/`.
2. Delete the dead inventory balances cluster: `getInventoryBalancesById` + `InventoryBalances` type + the single route that consumes it.

Out: Anything outside `packages/db/src/` except the ONE balances route file listed below. The `numberNeighborQueries` core stays as-is (only add the wrapper). Domain, application, and other API files are out of scope this session; do not touch them.

## Files you own (do not edit anything outside this list)

**New / edited shared helper**
- `packages/db/src/shared/number-neighbors.ts` — home of the existing `numberNeighborQueries`; add (or sibling-file) the new `resolveNumberNeighbors` wrapper here.

**12 read-repos — replace each wrapper body with a call to the shared resolver (keep the local return type + re-keying + null constant):**
- `packages/db/src/payments/read-repository.ts` — `getPaymentNeighbors:128` — `client.flooringPayment` — `paymentNumberInt` — select `{id}`
- `packages/db/src/work-orders/read-repository.ts` — `getWorkOrderNeighbors:278` — `client.flooringWorkOrder` — `workOrderNumberInt` — select `{id}` (leave the outer `getWorkOrderNeighborsById` ~:314 alone)
- `packages/db/src/products/read-repository.ts` — `getProductNeighbors:191` — `client.flooringProduct` — `productNumberInt` — select `{id}`
- `packages/db/src/warehouses/read-repository.ts` — `getWarehouseNeighbors:156` — `client.flooringWarehouse` — `warehouseNumberInt` — select `{id}`
- `packages/db/src/payment-purposes/read-repository.ts` — `getPaymentPurposeNeighbors:95` — `client.flooringPaymentPurpose` — `paymentPurposeNumberInt` — select `{id}`
- `packages/db/src/entity-types/read-repository.ts` — `getEntityTypeNeighbors:95` — `client.flooringEntityType` — `entityTypeNumberInt` — select `{id}`
- `packages/db/src/imports/read-repository.ts` — `getImportNeighbors:95` — `client.flooringImportEntry` — `importNumber` — select `{id}` (no null-guard today; shared guard is a superset)
- `packages/db/src/job-types/read-repository.ts` — `getJobTypeNeighbors:117` — `client.flooringJobType` — `jobTypeNumberInt` — select `{id}`
- `packages/db/src/properties/read-repository.ts` — `getPropertyNeighbors:104` — `client.property` — `propertyNumberInt` — select `{id}`
- `packages/db/src/inventory/read-repository.ts` — `getInventoryNeighbors:148` — `client.flooringInventory` — `inventoryNumberInt` — select `{id, warehouseId}` (THE ONLY DIVERGENT ONE: selects `id`+`warehouseId` at :161/:165, maps to `{id, warehouseId}` at :171-173)
- `packages/db/src/templates/read-repository.ts` — `getTemplateNeighbors:266` — `client.template` — `templateNumberInt` — select `{id}`
- `packages/db/src/entities/read-repository.ts` — `getEntityNeighbors:136` — `client.entity` — `entityNumberInt` — select `{id}`

**Dead balances cluster (delete together, atomic):**
- `packages/db/src/inventory/read-repository.ts` — delete `getInventoryBalancesById` (:244-266) AND the `InventoryBalances` type (:236-239). Keep `computeInventoryBalance` / `toInventoryFixedString` / `toDecimalString` — they stay live (used elsewhere in the same file).
- `apps/web/app/api/inventory/[id]/balances/route.ts` — delete the whole 45-line file (only file in that dir; delete the empty dir too).

## Layer-by-layer map

**Data — new shared wrapper (`shared/number-neighbors.ts`).** The where/orderBy core `numberNeighborQueries<F extends string>` already exists (:19) and its doc-comment states the invariant + that each repo composes the clauses with ITS OWN typed `findFirst` + `select`. Mirror the existing shared precedent (`exactNumberIntEquals`, `sliceHasMore<T>`, `combineAnd<W>` are all delegate-agnostic, one-fn-per-file, doc-commented, imported by explicit `.js` path — no barrel). Keep the Prisma delegate OUT of the helper signature; take a **finder callback** and be generic over row `T`:

```ts
async function resolveNumberNeighbors<F extends string, T>(
  field: F,
  currentInt: number | null,
  find: (q: {
    where: Record<F, { lt: number } | { gt: number }>
    orderBy: Record<F, "desc" | "asc">
  }) => Promise<T | null>,
): Promise<{ previous: T | null; next: T | null }>
```

The helper owns: null-guard (`currentInt === null` → `{ previous: null, next: null }`) + `numberNeighborQueries(field, currentInt)` + `Promise.all([find(previousQuery), find(nextQuery)])` + null-mapping. The caller supplies the typed Prisma call, e.g. inventory:
```ts
(q) => client.flooringInventory.findFirst({ ...q, select: { id: true, warehouseId: true } })
```
and re-keys `{ previous, next }` into its own `previousInventory`/`nextInventory` shape. Inventory's extra `warehouseId` rides along in `T` for free — NO special param.

**Data — 12 call sites.** Each wrapper collapses to: local null constant + `resolveNumberNeighbors(field, currentInt, find)` + re-key into the module's `XNeighbors` shape. Return types, `NO_X_NEIGHBORS` constants, and re-keying stay local (⚑ decision above). imports currently has no guard; the shared guard covers it — verify behavior unchanged.

**Data — delete balances.** `packages/db/src/inventory/read-repository.ts`: remove `InventoryBalances` (:236-239) and `getInventoryBalancesById` (:244-266). The type is re-exported via `packages/db/src/inventory/index.ts:2` → `packages/db/src/index.ts` (`@builders/db`) — grep confirms nothing imports it BY NAME beyond the 3 definition lines + the route, so no barrel edit is needed beyond deleting the source (the `export *` chain drops it automatically). Verify with grep after deletion.

**API — delete the one route (only cross-package file you own).** `apps/web/app/api/inventory/[id]/balances/route.ts` — imports `getInventoryBalancesById` (:1) and calls it (:33). Delete the whole file + its now-empty directory.

**Tests.** Zero direct test coverage of neighbors OR `getInventoryBalancesById` / `InventoryBalances` anywhere in `packages/*/tests` or `apps/web/tests`. Effectively zero data-layer test-update burden — but run the full gauntlet.

## Migration (if schema changes)
None — no schema change.

## Done means
- /check-gauntlet green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
