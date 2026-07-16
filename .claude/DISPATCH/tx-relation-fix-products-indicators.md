# tx-relation-fix-products-indicators — move multi-relation Prisma reads/enrich off the pinned tx connection onto the pool

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval; AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
On the Prisma pg driver adapter, a read/write whose `select`/`include` pulls **2+ relations** and runs on an interactive-transaction client (`tx` from `withDatabaseTransaction`, a single pinned connection) makes Prisma fire concurrent relation sub-queries on that one connection → node-postgres `"client is already executing a query"` → 500 + a wedged connection. The proven fix (already shipped for the inventory module — mirror it) is: keep transactions to **locks + writes + LEAN (relation-free) reads only**, and read the full multi-relation record on the **POOL** (the default `db` client, no `tx`) **AFTER** the transaction commits; likewise move any 6-relation existence/validation read to the pool. This session applies that same fix to the **products** and **inventory-indicators** use cases, which currently return full multi-relation records from inside the transaction.

## Reference precedent (read-only — do NOT edit these)
The inventory module already fixed this exact bug; use it as the pattern template:
- `packages/db/src/inventory/read-repository.ts` — added a **lean** `getInventoryMutableStateById` (relation-free existence/state read that is safe on `tx`).
- `packages/db/src/inventory/write-repository.ts` — write fns return a lean `{ id }` shape (no relations) from inside the tx.
- `packages/application/src/inventory/update-inventory.ts` + `create-inventory.ts` — **enrich** the full multi-relation record on the **pool** (default `db`) AFTER the tx commits, and that enriched record is what the use case returns.
- The inventory create/update **tests** mock the lean helper and assert the pool enrich (order: write-in-tx returns `{id}`, then a post-commit pool read). Mirror this test shape.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **create-indicator existence read:** reuse `getProductById` on the pool (a wasteful 6-relation read used only for a boolean) vs. add a new lean `productExists(id): Promise<boolean>` helper (parallels the existing `productNameExists`). Research leans **lean helper**.
- ⚑ **Rule strictness / how much to move pre-tx:** the relation-free existence guards (`getCategoryById` `{id,name}`, `entityExists` `{id}`, `productNameExists` `{id}`, `getUnitOfMeasureById` `{id,name,abbreviation}`, `getWarehouseById` scalars+`_count`) are already **safe on tx** — leave them in-tx for a minimal diff, vs. move ALL pre-tx to match the precedent (introduces a TOCTOU window, mitigated by FK RESTRICT + `@@unique`). Research leans **leave-in-tx**; only the 6-relation `getProductById` existence/current reads must move.
- ⚑ **update-product current read:** pool read pre-tx (research default) vs. a lean in-tx read (scalars + a single `category.name` 1-relation is still safe) vs. reuse the route's already-loaded OCC snapshot instead of re-reading. Decide which.
- ⚑ **P2002 name-conflict try/catch placement:** it MUST stay wrapping the in-tx write (the unique constraint fires **inside** the tx); only the post-commit enrich moves out. Confirm this split for BOTH `create-product` and `update-product`.
- ⚑ **Post-commit not-found handling:** after commit, if the pool enrich returns `null`, throw the module NOT_FOUND (decide the code per use case: `PRODUCT_NOT_FOUND` for products, `INVENTORY_INDICATOR_NOT_FOUND` for indicators), mirroring the inventory precedent.
- ⚑ **Tests:** the products + indicators use-case tests mock `@builders/db` — they must add the new lean helper(s) to the mock and assert the pool-enrich ordering (mirror how the inventory create/update tests were updated).

## Scope
In: Move every multi-relation (2+) Prisma read/enrich **off** the pinned tx connection in the products + inventory-indicators use cases — lean the in-tx writes to `{ id }`, move 6-relation existence/current reads and post-commit enrich onto the pool (`db`), add a new lean scope helper for indicators. Response bodies are unchanged (all four routes still return the FULL record).

Out: Any schema change or migration (none — code-only). The inventory module (reference precedent only). The shared guard helpers. Any module other than products/indicators. The confirmed non-triggers listed below.

## Files you own (do not edit anything outside this list)
- `packages/db/src/products/read-repository.ts` — houses `getProductById` (6-relation `productRowSelect`); ADD a lean helper alongside it (and/or `productExists` per flag). **`getProductById`'s signature must stay stable** — callers elsewhere rely on it; ADD, don't change.
- `packages/db/src/products/write-repository.ts` — `createProduct` / `updateProduct` → lean `{ id }` return.
- `packages/db/src/products/index.ts` — barrel export for any new helper.
- `packages/db/src/products/indicators/read-repository.ts` — ADD the new lean `getIndicatorScopeById`; `getIndicatorById` stays.
- `packages/db/src/products/indicators/write-repository.ts` — `insertIndicatorRow` / `updateIndicatorRecord` → lean `{ id }`, drop in-tx re-reads.
- `packages/db/src/products/indicators/index.ts` — barrel export for the new lean helper.
- `packages/application/src/products/create-product.ts` — lean write + pool enrich post-commit.
- `packages/application/src/products/update-product.ts` — pool current-read pre-tx + lean write + pool enrich post-commit.
- `packages/application/src/products/indicators/create-indicator.ts` — pool/lean existence read + lean write + pool enrich post-commit.
- `packages/application/src/products/indicators/save-indicators-section.ts` — lean scope reads in-tx + lean write + move the final list read onto the pool post-commit.
- Products + indicators use-case tests under `packages/application/tests/**` (and any products/indicators tests under `packages/db/**`) — add lean-helper mocks + assert pool-enrich order.

## Layer-by-layer map

### Response bodies (why lean-write alone is not enough — every write path needs a post-commit POOL enrich)
- `apps/web/app/api/products/route.ts:21` — returns `{ product: result }` (full record).
- `apps/web/app/api/products/[id]/primary/section/route.ts:37` — returns `{ product: result }` (full record).
- `apps/web/app/api/products/[id]/indicators/route.ts:84` — returns bare `result` (full record).
- `apps/web/app/api/products/[id]/indicators/section/route.ts:79` — returns `{ indicators: result.rows }` (full rows).

### Data — new lean helper
- `packages/db/src/products/indicators/read-repository.ts` — ADD `getIndicatorScopeById(id: string, client = db): Promise<{ id: string; productId: string } | null>` — `findUnique` with `select: { id: true, productId: true }` (relation-free; stays usable in-tx because the save loops lock+write on the scope result). Export via `packages/db/src/products/indicators/index.ts`.
- `packages/db/src/products/read-repository.ts` — (per ⚑) optionally ADD `productExists(id: string, client = db): Promise<boolean>` (parallels `productNameExists`); export via `packages/db/src/products/index.ts`. `getProductById` unchanged.

### Data — write fns → lean `{ id }` returns (signature → `Promise<{ id: string }>`; drop now-dead normalize imports/casts)
- `packages/db/src/products/write-repository.ts:59-83` — `createProduct` currently returns `productRowSelect` (6 relations) → `select: { id: true }`, return `{ id }`.
- `packages/db/src/products/write-repository.ts:85-113` — `updateProduct` currently returns `productRowSelect` (6 relations) → lean `{ id }`.
- `packages/db/src/products/indicators/write-repository.ts:44-64` — `insertIndicatorRow` currently does an in-tx re-read `getIndicatorById(id, tx)` at `:61` (3 relations) → **drop the re-read**, return lean `{ id }`.
- `packages/db/src/products/indicators/write-repository.ts:88-109` — `updateIndicatorRecord` currently does an in-tx re-read `getIndicatorById(id, tx)` at `:107` (3 relations) → **drop the re-read**, return lean `{ id }`.

### Application — create-product (`packages/application/src/products/create-product.ts`)
- `:66` `createProduct(..., c)` → write goes lean `{ id }`.
- Keep the **P2002 name-conflict catch INSIDE the tx** (`:85-95`) wrapping the write.
- After commit, enrich `getProductById(newId)` on the **POOL** (default `db`, no `c`) and return that. If null → throw `PRODUCT_NOT_FOUND` (⚑).
- The `getCategoryById` (`:27`), `entityExists` (`:37`), `productNameExists` (`:53`) guards are relation-free → leave in-tx (⚑).

### Application — update-product (`packages/application/src/products/update-product.ts`)
- `:29` `getProductById(id, c)` is `productRowSelect` (6 relations) and is **NOT existence-only** — it reads `current.category.name` (`:41`), `current.categoryId` (`:45`), `current.style` (`:59`), `current.color` (`:60`), `current.productNamingAddon` (`:63`), `current.name` (`:111`). FIX (caller-side): read `getProductById(id)` on the **POOL BEFORE** opening the tx (OCC is already enforced at the route via `loadSnapshot`); the null→`PRODUCT_NOT_FOUND` check moves with it. (⚑ — or lean in-tx read / reuse OCC snapshot.)
- `:125` `updateProduct(id, patch, c)` → write goes lean `{ id }`; keep the P2002 catch in-tx (`:126-135`); enrich `getProductById(id)` on the **POOL** post-commit and return that. If null → `PRODUCT_NOT_FOUND` (⚑).
- The `getCategoryById` (`:47`), `entityExists` (`:73`), `productNameExists` (`:112`) guards are relation-free → leave in-tx (⚑).

### Application — create-indicator (`packages/application/src/products/indicators/create-indicator.ts`)
- `:45` `getProductById(input.productId, c)` is **existence-only** but pulls 6 relations → move to the **POOL** pre-tx, or use a new lean `productExists` (⚑).
- `getWarehouseById` (`:53`), `getUnitOfMeasureById` (`:61`) are relation-free → leave in-tx (⚑).
- `:76` `insertIndicatorRow(c, …)` → write goes lean `{ id }` (in-tx re-read dropped in the data layer); enrich `getIndicatorById(newId)` on the **POOL** post-commit and return that. If null → `INVENTORY_INDICATOR_NOT_FOUND` (⚑).
- Keep the P2002 duplicate catch (`:86-102`) wrapping the in-tx write.

### Application — save-indicators-section (`packages/application/src/products/indicators/save-indicators-section.ts`)
- `:61` (deletes loop) and `:73` (modified loop) call `getIndicatorById(id, c)` — 3-relation reads on `tx`. Replace with the NEW lean `getIndicatorScopeById(id, c)` (`{ id, productId }`) — these stay **in-tx** because the loops lock (`lockIndicatorRow`) + write on the scope result. All that's consumed is `existing.id` and `existing.productId` — the lean shape covers both.
- `:96` `updateIndicatorRecord(c, …)` → write goes lean `{ id }` (in-tx re-read dropped in the data layer).
- `:99-102` `listIndicatorsForProduct({ productId, skip, take }, c)` (3 relations) is the LAST statement in the tx and builds the `{ rows }` result → **move it to the POOL after commit**: lift it out of the `withDatabaseTransaction` callback and call it with the default `db`. Return `{ rows }` from the pool read.

### Tests
- Products use-case tests + indicators use-case tests (`packages/application/tests/**`, plus any products/indicators tests under `packages/db/**`) mock `@builders/db`: add the new lean helper(s) (`getIndicatorScopeById`, and `productExists` if adopted) to the mock, switch the write-fn mocks to the lean `{ id }` return, and assert the **pool enrich** runs post-commit (mirror the inventory create/update test updates).

## Confirmed NON-triggers (do NOT change — relation-free / `_count`-only, safe on tx)
- `getCategoryById` (`{ id, name }`), `entityExists` (`{ id }`), `productNameExists` (`{ id }`), `getUnitOfMeasureById` (`{ id, name, abbreviation }`), `getWarehouseById` (scalars + `_count` only).
- `delete-product` (`_count`-only + delete).
- The indicators `normalizeIndicatorRows` `groupBy` is **sequential** (awaited after the `find`), NOT a `Promise.all` — not an independent concurrent trigger.

## Migration (if schema changes)
None — this is a code-only change; no schema edit, no migration.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test).
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits).
