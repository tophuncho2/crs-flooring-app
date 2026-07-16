# tx-relation-fix-work-orders-templates — stop multi-relation reads from running on the pinned transaction connection in work-orders + templates

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval; AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Fix a class of 500s + wedged database connections in the work-orders and templates modules. On the Prisma pg driver adapter, a read or write whose `select`/`include` pulls 2+ relations — when run on an interactive-transaction client (`tx` from `withDatabaseTransaction` = `db.$transaction(callback)`, a single pinned connection, `packages/db/src/client.ts:58-63`) — makes Prisma fire concurrent relation sub-queries on that one connection, tripping node-postgres "client is already executing a query" → 500 + a wedged connection. A `Promise.all` of statements on a `tx` client is a second independent trigger. The fix: keep transactions to locks + writes + LEAN (relation-free) reads only, and read the full multi-relation record on the POOL (default `db`, no `tx`) AFTER commit; move validation/existence reads to the pool too.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **D1 — Section-save result contract.** RECOMMENDED: keep each section use case's result shape by doing the pool enrich INSIDE the use case post-commit (items/plannedPayments stay populated, no route edit). ALTERNATIVE: shrink `applyXDiff` + the use-case result to `{tempIdMap}` only and lean on the section routes' existing pool re-read (less code, but changes the result types in the section `types.ts` files and depends on route behavior this branch does not own). Prefer the pool-enrich-in-use-case path.
- ⚑ **D2 — Sync-template read location.** `getTemplateById` inside `syncTemplateToWorkOrderUseCase` must move off `tx` (it is 5-6 relations and CANNOT be made lean — it needs `plannedProducts` + `plannedPayments` to copy) → read it on the POOL before opening the tx. Confirm the accepted tradeoff: a template deleted in the pool-read→WO-create window makes the new WO's `templateId` FK fail (P2003, tx rolls back) — rare/acceptable.
- ⚑ **D3 — Material-items pre-read.** Pool-read the full existing list via the existing `listWorkOrderMaterialItems` (minimal change) vs. add a lean `{id, productId}[]` helper `listWorkOrderMaterialItemProductRefs` to avoid the wasted relation load (the pre-read only needs id + productId for product-change detection).
- ⚑ **D4 — create/update write-repo return shape.** Lean `{id}` (recommended) vs. an options flag to skip relations. Recommend `{id}` + pool enrich.
- ⚑ **G1 — Gauntlet ordering (only if D1 ALTERNATIVE chosen).** Confirm `buildResponseBody` runs strictly AFTER the use case's `withDatabaseTransaction` resolves (`apps/web/server/http/run-mutation.ts` — NOT owned; read-only check). The recommended enrich-in-use-case path is immune to this.
- ⚑ **G2 — Tests will need rework.** Several tests mock the changing seams and assert old shapes — update them to mock the pool enrich + assert the post-commit read (see the tests list under "Layer-by-layer map").
- ⚑ **G3 — Confirm no other consumer of the fat write-repo returns.** Grep to confirm only the section routes + these use cases + the tests consume the changed functions before narrowing return types (ignore stale `packages/db/dist` build artifacts).

## Scope
In: Make transactions do locks + writes + lean relation-free reads only, in the work-orders and templates application + db layers. Move each multi-relation record read to the POOL after commit (and validation/existence reads to the pool), while PRESERVING every use case's existing result contract by enriching inside the use case post-commit — so no route needs to change.

Out: No schema change and no migration. Do NOT edit any `apps/web/**` route. Do NOT edit the inventory module (it is the already-shipped reference precedent — read it for the pattern, do not touch it). Do NOT edit the shared `guard-products-exist.ts` or any other shared guard file. Do NOT edit `getProductById` in the products read-repository (you CALL it on the pool; its signature must stay stable). Do NOT touch any module other than work-orders/templates.

## Files you own (do not edit anything outside this list)
- `packages/db/src/work-orders/write-repository.ts` — `createWorkOrderRecord`, `updateWorkOrderRecord`, `createWorkOrderFromTemplateRecord` → lean `{id}`; drop in-tx list reads in the from-template path
- `packages/db/src/work-orders/read-repository.ts` — pool getters used for enrich (`getWorkOrderDetailById`, `listWorkOrderMaterialItems`, `listWorkOrderPlannedPayments`); optional lean product-ref helper (D3)
- `packages/db/src/work-orders/shared.ts` — shared selects if a lean helper is added
- `packages/db/src/work-orders/material-items/write-repository.ts` — `applyWorkOrderMaterialItemsDiff` → drop in-tx list read, return `{tempIdMap}`
- `packages/db/src/work-orders/planned-payments/write-repository.ts` — `applyWorkOrderPlannedPaymentsDiff` → drop in-tx list read, return `{tempIdMap}`
- `packages/db/src/templates/write-repository.ts` — `createTemplateRecord`, `updateTemplateRecord` → lean `{id}`
- `packages/db/src/templates/read-repository.ts` — pool getters used for enrich (`getTemplateById`, `listTemplatePlannedProducts`, `listTemplatePlannedPayments`)
- `packages/db/src/templates/planned-products/write-repository.ts` — `applyTemplatePlannedProductsDiff` → drop in-tx list read, return `{tempIdMap}`
- `packages/db/src/templates/planned-payments/write-repository.ts` — `applyTemplatePlannedPaymentsDiff` → drop in-tx list read, return `{tempIdMap}`
- `packages/application/src/work-orders/create-work-order.ts` — post-commit pool enrich
- `packages/application/src/work-orders/update-work-order.ts` — post-commit pool enrich; keep P2025→404 catch
- `packages/application/src/work-orders/delete-work-order.ts` — SAFE, no change expected (verify)
- `packages/application/src/work-orders/sync-template-to-work-order.ts` — move template read to pool pre-tx; from-template lean create; post-commit pool enrich
- `packages/application/src/work-orders/material-items/save-work-order-material-items-section.ts` — pool pre-read, caller-side pool product fetcher, post-commit pool enrich
- `packages/application/src/work-orders/planned-payments/save-work-order-planned-payments-section.ts` — post-commit pool enrich
- `packages/application/src/templates/create-template.ts` — post-commit pool enrich
- `packages/application/src/templates/update-template.ts` — post-commit pool enrich; keep P2025→404 catch
- `packages/application/src/templates/delete-template.ts` — SAFE, no change expected (verify)
- `packages/application/src/templates/planned-products/save-template-planned-products-section.ts` — caller-side pool product fetcher, post-commit pool enrich
- `packages/application/src/templates/planned-payments/save-template-planned-payments-section.ts` — post-commit pool enrich
- The work-orders + templates test files under `packages/application/tests/**` (and any under `packages/db`) that mock the above seams

## Layer-by-layer map

### Data (write-repos → lean `{id}`; drop in-tx multi-relation reads)
```
Data — packages/db/src/work-orders/write-repository.ts:48 (createWorkOrderRecord, .create :52, workOrderDetailSelect = 3 rel) → return {id}
Data — packages/db/src/work-orders/write-repository.ts:59 (updateWorkOrderRecord, .update :64, 3 rel) → return {id}; the .update still throws P2025→404, keep the catch at update-work-order.ts:32
Data — packages/db/src/work-orders/write-repository.ts:130 (createWorkOrderFromTemplateRecord, .create :134, 3 rel) → return {id}; DROP the two in-tx list reads at :168 (listWorkOrderMaterialItems) and :169 (listWorkOrderPlannedPayments); KEEP the createMany writes
Data — packages/db/src/templates/write-repository.ts:101 (createTemplateRecord, .create :105, templateDetailSelect = 5-6 rel) → return {id}
Data — packages/db/src/templates/write-repository.ts:112 (updateTemplateRecord, .update :117, 5-6 rel) → return {id}; keep P2025→404 catch at update-template.ts:35
Data — packages/db/src/work-orders/material-items/write-repository.ts:65 (applyWorkOrderMaterialItemsDiff) → DROP in-tx listWorkOrderMaterialItems(tx) at :111; return {tempIdMap}
Data — packages/db/src/work-orders/planned-payments/write-repository.ts:34 (applyWorkOrderPlannedPaymentsDiff) → DROP in-tx listWorkOrderPlannedPayments(tx) at :82; return {tempIdMap}
Data — packages/db/src/templates/planned-products/write-repository.ts:46 (applyTemplatePlannedProductsDiff) → DROP in-tx listTemplatePlannedProducts(tx) at :89; return {tempIdMap}
Data — packages/db/src/templates/planned-payments/write-repository.ts:37 (applyTemplatePlannedPaymentsDiff) → DROP in-tx listTemplatePlannedPayments(tx) at :85; return {tempIdMap}
```

### Application (post-commit pool enrich using EXISTING pool getters — no new read helper required)
```
Application — packages/application/src/work-orders/create-work-order.ts:9 (tx :15) → after commit, getWorkOrderDetailById(id) on pool; return that
Application — packages/application/src/work-orders/update-work-order.ts:18 (tx :25) → after commit, getWorkOrderDetailById(id) on pool; return that; keep P2025→404 catch at :32
Application — packages/application/src/work-orders/sync-template-to-work-order.ts:31 (tx :37):
    (a) move getTemplateById(id,{withNeighbors:false}) OFF tx — read on the POOL BEFORE opening the tx (5-6 rel, CANNOT be lean — needs plannedProducts + plannedPayments to copy; the template pre-exists and is NOT mutated here)
    (b) createWorkOrderFromTemplateRecord returns lean {id} + its two in-tx list reads are dropped
    (c) after commit enrich on the POOL: getWorkOrderDetailById(id) + listWorkOrderMaterialItems(id) + listWorkOrderPlannedPayments(id) (Promise.all on the POOL is safe) → return {workOrder, items, plannedPayments}
Application — packages/application/src/work-orders/material-items/save-work-order-material-items-section.ts:39 (tx :45):
    (a) move the in-tx pre-read listWorkOrderMaterialItems(workOrderId, c) at :72 (2 rel, used for product-change detection, needs no uncommitted data) to the POOL (drop c) — see D3 for optional lean helper
    (b) guardProductsExist Promise.all getProductById(id, c) at :92-93 → CALLER-SIDE fix: pass a pool fetcher (id)=>getProductById(id) (drop c)
    (c) applyWorkOrderMaterialItemsDiff no longer re-reads in-tx → use case enriches listWorkOrderMaterialItems(workOrderId) on the POOL post-commit → return {items, tempIdMap}
Application — packages/application/src/work-orders/planned-payments/save-work-order-planned-payments-section.ts:19 (tx :26):
    applyWorkOrderPlannedPaymentsDiff no longer re-reads → enrich listWorkOrderPlannedPayments(workOrderId) on POOL post-commit. No guard/pre-read here.
Application — packages/application/src/templates/create-template.ts:7 (tx :14) → after commit, getTemplateById(id) on pool; return that
Application — packages/application/src/templates/update-template.ts:11 (tx :19) → after commit, getTemplateById(id) on pool; return that; keep P2025→404 catch at :35
Application — packages/application/src/templates/planned-products/save-template-planned-products-section.ts:20 (tx :27):
    (a) guardProductsExist Promise.all getProductById(id, c) at :64-67 → CALLER-SIDE pool fetcher (drop c)
    (b) applyTemplatePlannedProductsDiff no longer re-reads → enrich listTemplatePlannedProducts(templateId) on POOL post-commit. No pre-read here.
Application — packages/application/src/templates/planned-payments/save-template-planned-payments-section.ts:19 (tx :26):
    applyTemplatePlannedPaymentsDiff no longer re-reads → enrich listTemplatePlannedPayments(templateId) on POOL post-commit.
SAFE (no change) — packages/application/src/work-orders/delete-work-order.ts:12 (deleteWorkOrderRecordById write-repository.ts:72, no relation read)
SAFE (no change) — packages/application/src/templates/delete-template.ts:6 (deleteTemplateRecordById write-repository.ts:125)
```

### guardProductsExist caller-side fix (do NOT edit the shared guard)
The shared guard `packages/application/src/shared/guard-products-exist.ts:16` is OUT OF BOUNDS — do not edit it. Fix at the two callers: inject a POOL fetcher (no `c`) so each `getProductById` runs on its own pooled connection instead of firing `Promise.all` on the pinned tx connection. Product existence is pure validation (products are not written in the tx) and the `createMany`/`update` FK constraint backstops the tiny window — this is exactly what the reference precedent does.
- Caller 1: `packages/application/src/work-orders/material-items/save-work-order-material-items-section.ts:92-93`
- Caller 2: `packages/application/src/templates/planned-products/save-template-planned-products-section.ts:64-67`
Both live under the owned work-orders/ and templates/ application dirs.

### Reference precedent (READ for the pattern — do NOT edit)
- Lean write returning `{id}`: `insertInventoryRow` / `updateInventoryRecord` in `packages/db/src/inventory/write-repository.ts`
- Post-commit pool enrich: `getInventoryById(id)` with no client at `packages/application/src/inventory/update-inventory.ts:81`
- Guard fetcher on the pool: `getProductById` read on the pool at `packages/application/src/inventory/create-inventory.ts:41`
- The inventory create/update tests were updated to mock the pool enrich + assert the post-commit read — mirror that when reworking the tests below.

### Tests (rework to mock the new seams + assert the pool enrich)
```
Tests — packages/application/tests/work-orders/sync-template-to-work-order.test.ts — mocks createWorkOrderFromTemplateRecord returning {workOrder,items} at :53, asserts record.items at :134 → update to lean {id} + pool enrich
Tests — packages/application/tests/work-orders/material-items/save-work-order-material-items-section.test.ts — mocks listWorkOrderMaterialItems :13/:38 + applyWorkOrderMaterialItemsDiff :11/:37 → update to pool pre-read + pool enrich, applyDiff returns {tempIdMap}
Tests — also update: create-work-order, update-work-order, save-work-order-planned-payments-section, create-template, update-template, save-template-planned-products-section, save-template-planned-payments-section tests (mock the pool enrich + assert order)
```

### Why no new lean read helper is strictly required
Unlike the inventory precedent, every read here can move fully to the pool: the create/update write-repos return `{id}` and existing pool getters (`getWorkOrderDetailById` / `getTemplateById`) enrich; the section list re-reads move to the pool via the existing `list*` functions; and the `.update` itself provides the P2025 existence guard, so no separate existence read is needed. (D3 offers an OPTIONAL lean `{id, productId}[]` helper only to trim the material-items pre-read.)

### Route-contract framing (why this needs no route edit)
This branch owns `packages/**` but NOT `apps/web/**` routes, so the fix must PRESERVE each use case's result contract by enriching on the pool inside the use case post-commit. The four section-save routes already re-read on the pool in `buildResponseBody` and discard the use case's returned list (only `tempIdMap` is consumed) — but the create/sync routes return the use-case result DIRECTLY, so the use case must still produce the full record. Enriching inside the use case is safe for BOTH route styles and needs no route change.

## Migration (if schema changes)
None — code-only change; no schema edit, no migration.

## Done means
- /check-gauntlet green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
