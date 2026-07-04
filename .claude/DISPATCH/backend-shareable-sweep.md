# backend-shareable-sweep — Dedupe, de-stale, and harden the three backend layers (domain / data / application)

## How to use this brief (receiving session, read first)
This is a discovery-only map produced by a scan session (no edits were made). It is a **high-confidence map, NOT a substitute for reading the code** — every claim below was verified by reading the file, but line numbers drift.
1. Pick ONE work package (WP) below. Each WP is sized to be one branch / one worktree.
2. Read the **Conflict/Sequence** note on your WP — several WPs touch the same files and MUST be ordered, not run in parallel branches.
3. Honor your mode: PLAN mode → plan + stop for approval; AUTO mode → execute. Research-and-validate against live code BEFORE acting.
4. These are refactors with **zero external API/behavior change** unless a WP explicitly says otherwise (the robustness WPs do change behavior). Keep `/check` green.

## Scope of the scan
`packages/domain/src` (175 files · 6.5k LOC), `packages/db/src` (87 files · 9.6k LOC, the DATA layer), `packages/application/src` (151 files · 6.0k LOC). The `apps/web/modules/*/data` folders are request/query shaping, NOT persistence — **out of scope**. `src/generated/` (Prisma codegen) — out of scope.

---

## Systemic themes (recurring across layers)

1. **Client-type / transaction plumbing is copy-pasted.** Data re-declares `PrismaClient | Prisma.TransactionClient` in ~32 files though a canonical `DataAccessContext` exists (`packages/db/src/types.ts:3`). Application repeats `withDatabaseTransaction(tx => { const c = client ?? tx … })` in ~43 use cases. Both collapse to one helper each.
2. **Prisma-error predicates are half-shared.** `isP2002` has a clean home + shim; its siblings `isP2025` (16 inline sites) and `isP2003` (4 inline sites, no helper) are hand-rolled. One family, one home.
3. **The `"(2D drops them)"` snapshot comment is stale everywhere.** Future-tense narration of a column-drop that already shipped 2026-07-03 — **20 sites** (18 in data, 2 in domain). One find-and-purge sweep. Several nearby comments describe dropped columns / retired features (side-panel, sendUnit*, merge) as if current.
4. **Read-path boilerplate repeats.** Exact-int number-search (~13×), `take+1`/`hasMore` pagination (data ~14× / application ~14–24×), number-neighbor runners (~11×), order-by assembly (~9×), AND-clause combine (~10×) — all mechanical extractions into each layer's `shared/`.
5. **Per-module error-class boilerplate.** 18 application `errors.ts` each redeclare an identical ~20-line `ExecutionError` class — only the `name` string + `code` union differ (~360 collapsible LOC).

---

## Master priority table

Leverage = sites touched × how mechanical. Effort S/M/L. "Ships alone" = disjoint file set, safe as its own branch.

| WP | Layer | What | Sites | Leverage | Effort | Ships alone? |
|----|-------|------|-------|----------|--------|--------------|
| **A3** | application | Generic `ExecutionError<TCode>` → 18 `errors.ts` | 18 files | ★★★ | M | ✅ disjoint (errors.ts only) |
| **X1** | cross (db+app) | `isP2025`+`isP2003` helpers → replace inline | 20 | ★★★ | S | ⚠ shares files w/ A2 |
| **A2** | application | `withUseCaseClient` → ~43 mutation use cases (+kills redundant nested txn) | 43 | ★★★ | M | ⚠ shares files w/ X1,A5,A6 |
| **D1** | data | Replace local client-type alias w/ `DataAccessContext` | 32 | ★★★ | S | ⚠ shares files w/ D2,D3,D4 |
| **D2** | data | Extract number-search / pagination / neighbor-runner / order-by / AND-combine / decimal → `db/src/shared` | ~60 | ★★★ | L | ⚠ shares files w/ D1,D3,D4 |
| **Dm1** | domain | `toIsoString` (+toFiniteNumber, quantity-rules, signed-money, pluralize, name-conflict) → `domain/src/shared` | ~40 | ★★★ | M | ⚠ shares files w/ Dm2 |
| **A4** | application | `resolveOptionsWindow` + `resolveSortEntries` (pagination + multi-sort) | ~24 | ★★ | M | mostly (search/list files) |
| **C1** | domain+data | Stale-comment purge (`2D drops them` ×20 + dropped-column/feature comments) | ~30 | ★★ | S | ⚠ comment-only but shares files everywhere |
| **A6** | application | Adjustments module-local helpers (recompute+ceiling, OCC, prelude) | 3 files | ★★ | S | ⚠ shares files w/ A2 |
| **D4** | data | Robustness quick wins (unprojected select, unused _count, dead code, missing-row contract) | ~7 | ★★ | S | ⚠ shares files w/ D1,D2 |
| **Dm3** | domain | Float `toFixed` money math → money standard; PaletteColor validation gap | ~7 | ★★ | M | mostly (line-totals/record-summary/forms) |
| **A5** | application | `emptyToNull`/`notesOrNull` → `shared/normalize.ts` | 5 | ★ | S | ⚠ shares files w/ A2 |
| **A7** | application | Missing `client` param (4 auth/invite use cases); OCC rule → domain | ~6 | ★ | S | mostly |
| **D5** | data | Business logic out of data layer (WO file-gen grouping/sort → domain; staged eligibility rule) | 2 | ★ | M | mostly |
| **EPIC-RENAME** | all | Strip `Flooring` prefix from 14 models + 5 enums (user runs migrations) | 19 models | — | L | separate epic |
| **EPIC-FLATTEN** | all | Delete `flooring/`+`management/` area folders, modules up one level | 48 dirs | — | M | one-shot, standalone |

**Recommended order:** the low-conflict disjoint wins first — **A3**, then the application use-case pass **(X1 → A2 → A5 → A6 as ONE sequenced branch)**, the data pass **(C1-data → D1 → D2 → D4 as ONE sequenced branch)**, the domain pass **(C1-domain → Dm1 → Dm3)**, then **A4 / A7 / D5** as cleanup. Run the two EPICs after the dedupe sweeps, and never interleave RENAME with FLATTEN (both rewrite every module tree).

---

## Work packages — detail

### A3 — Generic `ExecutionError<TCode>` (disjoint, do first)
18 module `errors.ts` files each declare a byte-identical ~20-line class (fields `code/status/field/payload`, same constructor) differing only by `name` + code union. E.g. `flooring/payments/errors.ts:6-26`, `management/entities/errors.ts:6-26`, `flooring/inventory/errors.ts:11-31`.
- **Do:** `packages/application/src/shared/execution-error.ts` → `class ExecutionError<TCode extends string>`; each module keeps only its `TCode` union + a 1-line subclass (preserve distinct `.name` for `instanceof`).
- **Files:** new shared file + 18 `errors.ts`. **Conflict:** none — nothing else touches `errors.ts`. Clean branch.

### X1 — Prisma-error predicate family
`isPrismaNotFoundError` exists at `packages/db/src/errors.ts:63` and is used correctly in `apps/web/modules/*/data/queries.ts`, but the raw `error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"` is inlined in **16** application use cases: `management/entity-types/{delete,update}`, `management/job-types/{delete,update}`, `management/properties/{update,delete,create-property-hub:116}`, `management/templates/{update,delete}`, `management/entities/{delete,update}`, `flooring/payments/{update,delete}`, `flooring/work-orders/{delete,update,sync-template-to-work-order:42}`. `P2003` (FK) is inlined in **4**: `management/entities/{create:40,update:46}`, `flooring/payments/{create:45,update:55}` with no helper anywhere.
- **Do:** add `isP2003` beside the existing predicates in `db` (`errors.ts` or `shared/prisma-errors.ts` — pick one Prisma-error home, see note); re-export `isP2025`/`isP2003` through `application/src/shared/prisma-errors.ts` (already the shim pattern for `isP2002`); replace all 20 inline sites; drop now-unused raw `Prisma` imports.
- **Note:** `db` splits Prisma predicates across `errors.ts` (P2025, connectivity) and `shared/prisma-errors.ts` (P2002). Consider consolidating into one file while here (low pri).
- **Conflict:** the 16 P2025 files are the SAME mutation use cases A2 rewraps → **do X1 before A2 in the same branch, or fold together.**

### A2 — `withUseCaseClient` transaction wrapper
~43 mutation use cases open `withDatabaseTransaction(async (tx) => { const c = client ?? tx … })`. When a `client` IS passed, the wrapper still opens a real-but-unused nested transaction (`tx` created then discarded).
- **Do:** `packages/application/src/shared/with-use-case-client.ts` → `withUseCaseClient(client, fn)` that runs `fn(client)` directly when a client is present and only opens `withDatabaseTransaction` otherwise. Refactor all ~43 sites (grep `const c = client ?? tx`).
- **Conflict:** overlaps X1, A5, A6 (same files). Sequence as one application-internals branch.

### A4 — Pagination window + multi-sort resolution
`Math.max(1, Math.min(MAX_TAKE, Math.floor(input.take ?? DEFAULT_TAKE)))` + `DEFAULT_TAKE/MAX_TAKE` copied across ~14 `search-*options.ts` (+ ~10 `pageSize` list variants). Multi-col sort normalization (`sorts ?? (sort ? [sort] : [])` → slice `MAX_SORT_LEVELS` → entries) verbatim in 5 list/export files (`contracts.ts:19` already documents it as a convention to codify).
- **Do:** `shared/pagination.ts` → `resolveOptionsWindow(input,{defaultTake,maxTake})`; `list-view/` → `resolveSortEntries(input,maxLevels)`.
- **Conflict:** mostly disjoint from mutation WPs; minor overlap with list files in D-layer only.

### A5 — `emptyToNull` normalize helper
Identical `emptyToNull` re-declared in `flooring/imports/create-import.ts:12`, `update-import.ts:21`, `flooring/inventory/update-inventory.ts:12`; `notesOrNull` in `sync-template-to-work-order.ts:23`; money variant in `save-import-staged-inventory-section.ts:37`.
- **Do:** `shared/normalize.ts` → `emptyToNull`. **Conflict:** files overlap A2 — fold in.

### A6 — Adjustments module-local helpers
The recompute→ceiling-assert block (~35 lines) is verbatim in `create-pending-adjustment.ts:145-184`, `update:145-179`, `delete:77-111`; OCC-stale translation verbatim in update/delete; mutation prelude (fetch+NOT_FOUND+scope-assert) verbatim in update/delete.
- **Do:** module-local `flooring/inventory/adjustments/recompute-and-assert-ceiling.ts` (+ prelude/OCC helpers) — NOT `src/shared` (adjustment-specific). **Conflict:** the trio is touched by A2 — sequence.
- **⚑ NOTE:** memory flags the two inventory/WO **adjustment create modals as SACRED (UI)** — this WP is the application layer, not those modals, but confirm scope stays server-side.

### A7 — Robustness (application)
- Missing `client?` param (rule 3): `management/users/set-user-active.ts`, `update-user-rank.ts`, `management/invites/create-invite.ts`, `revoke-invite.ts` (+ read-only `resolve-signup-invite.ts`, `mark-signup-invite-accepted.ts`).
- `update-user-rank.ts:55` hand-compares `updatedAt` OCC in the use case → should be a domain assertion (rule 5), mirroring `assertAdjustmentExpectedUpdatedAtMatches`.
- `create-property-hub.ts:17` borrows `EntityExecutionError` + inlines entity create/P2025 translation (coupling, not a rule violation — flag only).

### D1 — `DataAccessContext` alias
~32 data files re-declare `type XDbClient = PrismaClient | Prisma.TransactionClient` (e.g. `flooring/inventory/shared.ts:4`, `flooring/payments/read-repository.ts:14`, `management/entities/read-repository.ts:16`, `management/users/read-repository.ts:5`; `queues/outbox-repository.ts:5` + `mutation-receipts.ts:4` use the `typeof db` variant). Canonical `DataAccessContext` already at `packages/db/src/types.ts:3`.
- **Do:** import `DataAccessContext`, delete the local aliases. **Conflict:** touches nearly every read/shared file → base of the data branch; do before D2.

### D2 — Data `shared/` extractions
- **Exact-int number-search** (~13): `raw.trim()`→strip non-digits→`parseInt`→`{equals: isInteger ? n : -1}` sentinel. Sites incl. `payments/read:47`, `inventory/read:446`, `adjustments/read:414`, `imports/read:203,339`, `products/read:373`, `warehouses/read:250`, `work-orders/read:119`, `job-types/read:61`, `entities/read:196`, `entity-types/read:60`, `properties/read:203`. → `db/src/shared/number-search.ts` → `exactNumberEquals(raw)`.
- **`take+1`/`hasMore`/slice pagination** (~14 across 11 files): `categories:111`, `unit-of-measures:86`, `warehouses/read:110`, `products/read:457`, `imports/read:351`, `work-orders/read:250`, `inventory/read:618/671/736`, `adjustments/read:266`, `entities/read:281`, `properties/read:274`, `entity-types/read:184`, `templates/read:231`. → `db/src/shared/pagination.ts` → `sliceHasMore(rows, take)`.
- **Number-neighbor runner** (~11): the null-guard→`numberNeighborQueries`→`Promise.all([findFirst prev, findFirst next])` wrapper (where/orderBy already shared via `number-neighbors.ts`; the runner is copied). → extend `db/src/shared/number-neighbors.ts` → `resolveNumberNeighbors(delegate, field, int)`.
- **Order-by** (~9): `appendUniqueOrderBy<T>` byte-identical in 4 `order-by.ts` (`inventory/work-orders/properties/templates`:10) + `assembleListOrderBy` skeleton (entries-loop + createdAt/id tiebreak) in 5. → `db/src/shared/order-by.ts`.
- **AND-clause combine** (~10): `len===0?undefined:len===1?c[0]:{AND:c}`. → `db/src/shared/where.ts` → `combineAndClauses`.
- **Decimal coercion** (~5, divergent null semantics): `toDecimalString`/`toDecimalStringOrNull` in inventory/adjustments/staged reads. → `db/src/shared/decimal.ts` (unify null form deliberately).
- **Intra-module (not shared):** inventory parent-context select+normalize duplicated within `adjustments/read` (`:172-212` vs `:561-607`); staged per-row builders duplicated between per-row write-repo and section write-repo (must stay in sync — D9); `normalizeNullablePhone` verbatim in `entities/write:16` ≡ `properties/write:15` (→ pure domain formatter); entities/properties read-vs-write detail-selects drift (write omits `*NumberInt`).
- **Conflict:** overlaps D1 (same read files) → after D1.

### C1 — Stale-comment purge (domain + data)
- **`"(2D drops them)"` / snapshot future-tense** — 20 sites: 18 in data (e.g. `inventory/shared.ts:26`, `products/shared.ts:79`, `work-orders/read:480`, `templates/read:96`, `staged-inventory-rows/read:36`, `adjustments/read:88/187/577`) + 2 in domain (`templates/planned-products/normalizers.ts:26`, `work-orders/material-items/normalizers.ts:26`). Fix to past tense / delete; the sibling `types.ts` already uses correct past tense.
- **Flatly wrong:** `products/shared.ts:5-10` says the select "pulls unit snapshots off the product row (migration …_add_product_unit_snapshots)" — those cols are dropped; the select actually joins `unit`/`coverageUnit`. HIGH — fix to match code.
- **Other stale:** `products/write:13-17` (legacy sendUnit/stockUnit snapshots — dropped/renamed), `inventory/write:30/153/234` (snapshot field docstrings), `adjustments/read:50/133` (frozen-snapshot + dropped `workOrderItemId` join), `adjustments/read:368` (retired hub side panel), `adjustments/read:350-387` (docstrings orphaned above the wrong function). Domain: `payments/signed-amount.ts:29` convergence note (resolve via Dm1), `work-orders/create-work-order.ts:19-24` explain-what-isnt-there.
- **Conflict:** comment-only but touches files every data/domain WP touches → either do FIRST as a standalone purge commit, or fold each comment fix into the WP that owns the file. Recommend a single up-front purge commit so later branches start clean.

### Dm1 — Domain `shared/` extractions
- **`toIsoString`** — the biggest domain win: `value instanceof Date ? value.toISOString() : value` inlined ~22× across 13 normalizers + 4 redundant local `toIso`/`toIsoDate` defs (`management/users/normalizers.ts:4`, `management/invites/normalizers.ts:14`, `flooring/payments/normalizers.ts:27`, `flooring/work-orders/normalizers.ts:57`). → `shared/date-format.ts` → `toIsoString(value): string` (single null→"" form subsumes all variants).
- **`toFiniteNumber`** — `parseInventoryDecimal` (`flooring/inventory/formatters.ts:4`) ≡ private `toNumber` (`shared/line-totals.ts:8`). → one `shared/` export; alias the old name.
- **`validateOptionalPositiveQuantity`** — `templates/planned-products/rules.ts:8` ≡ `work-orders/material-items/rules.ts:9`. → `shared/quantity-rules.ts`.
- **`formatSignedMoney(amount, sign)`** — `inventory/formatters.ts:36` ≡ `payments/signed-amount.ts:31` (code self-flags convergence). → `shared/money.ts`.
- **`pluralize`** — `${n} X${n===1?"":"s"}` ~8× (`imports/delete-rules.ts:14/19`, `imports/warehouse-rules.ts:11/16`, `products/product-rules.ts:25/28/31`, `inventory/delete-rules.ts:13`). → `shared/pluralize.ts`.
- **`isCaseInsensitiveNameConflict`** — `warehouses/warehouse-rules.ts:33` ≡ `products/product-rules.ts:45`. → `shared/name-rules.ts`.
- **Convergence (adopt, don't extract):** `isBlankName` exists but job-types/entity-types/templates form-rules use raw `!x.trim()`.
- **Leave alone (over-abstraction risk per user):** item-row normalizer shapes, per-module domain error classes, field-membership predicate factories, the two diff-save skeletons.
- **Conflict:** overlaps C1-domain → after the comment purge.

### Dm3 — Domain robustness
- **Float `toFixed` money math** — `shared/line-totals.ts` (`calculateLineTotal:13`, `formatLineTotal:18`, `sumLineTotals:25`) + `shared/record-summary.ts` sum floats + `` `$${x.toFixed(2)}` ``, bypassing the BigInt money standard the codebase warns against (`shared/money.ts:45`, `adjustments/money.ts:9`). Route through `normalizeMoneyAmount`/`formatMoney` or explicitly document as display-only estimates. **⚑ Decide which** (see Flags).
- **PaletteColor gap** — validated only in `entity-types/form-rules.ts:13`; NOT in `entities/`, `properties/`, `templates/`, `work-orders/`, payments forms that also carry `color`. **Verify the zod payload/API layer guards color** before adding — the domain form validator may intentionally not be the sole guard.

### D4 — Data robustness quick wins
- `payments/read:97` `getPaymentById` uses `findUnique({where:{id}})` with **no `select`** → full unprojected row; add explicit select like every sibling.
- `inventory/shared.ts:44` selects `_count:{inventoryAdjustments}` on **every** row read but normalizers never consume it (delete-state has its own count) → drop the per-row subquery.
- Dead code: `inventory/write:117-138 updateInventoryNetDeducted` ("no direct callers"); `inventory/read:259-302 getInventoryRowsForMerge` + `MergeSourceInventoryRow` (merge was torn out all layers) → verify + delete.
- Divergent missing-row contract: `entities/read:147 findUniqueOrThrow` throws P2025 while `entity-types/read:122`, `job-types/read:153` return null → pick one.
- Low: write repos lack P2002/P2003→domain-error mapping (only `queues/outbox-repository.ts` maps); `users/write` reads `updatedAt` "for OCC" but blind-updates by id (no OCC enforced).
- **Conflict:** overlaps D1/D2 → same data branch.

### D5 — Business logic out of the data layer (rule 2)
- `work-orders/read:413-611 getWorkOrderForFileGeneration` embeds a DEDUCTION-only filter + two group-into-product-blocks + `localeCompare` sort passes → presentation/grouping belongs in domain. Larger, careful.
- `staged-inventory-rows/write:156-187 markStagedRowsForImport` encodes the DRAFT→QUEUED eligibility rule (guarded `updateMany` + derived `skippedRowIds`) in persistence → conditional business rule in data.

---

## EPIC-RENAME — strip the `Flooring` model-name prefix (user runs migrations)
14 models + 5 enums in `packages/db/prisma/schema.prisma` still carry `Flooring`. **Zero target-name collisions** (all stripped names are free). **Proven pattern:** pure-metadata physical rename migration (`ALTER TABLE … RENAME`, OID-stable, no rewrite/backfill) exactly like `20260703160000_rename_template_…`; commit `6dd66170` shows the full-stack sweep (schema → 3 packages → UI dirs → tests). **User runs the migration, never Claude.**

Ranked (mechanical leaves → entangled hubs; do hubs last):
| Order | Model/Enum → target | `@@map` | refs (files) | class |
|---|---|---|---|---|
| enums | `FlooringTimeOfDay`→`TimeOfDay` / `FlooringVacancyStatus`→`VacancyStatus`* / `FlooringPaymentDirection`→`PaymentDirection` / `FlooringStagedRowStatus`→`StagedRowStatus` / `FlooringInventoryAdjustmentType`→`InventoryAdjustmentType` | — (ALTER TYPE) | 4–31 | mechanical |
| leaves | `FlooringCategory`→`Category`, `FlooringEntityType`→`EntityType`†, `FlooringUnitOfMeasure`→`UnitOfMeasure`, `FlooringWarehouse`→`Warehouse`, `FlooringJobType`→`JobType`, `FlooringPayment`→`Payment` | yes | 11–40 | mechanical |
| hubs | `FlooringProduct`→`Product` (12 rel), `FlooringInventory`→`Inventory`, `FlooringInventoryAdjustment`→`InventoryAdjustment`, `FlooringImportEntry`→`ImportEntry`, `FlooringImportStagedInventoryRow`/`…FilterRow`, `FlooringWorkOrder`→`WorkOrder` (11 rel), `FlooringWorkOrderItem`→`WorkOrderItem` | yes | 14–48 | entangled |

\* `FlooringVacancyStatus` is re-exported **by value** at `packages/db/src/index.ts:1` — that barrel line must change with the rename.
† Free — the existing `EntityEntityType` join model (schema:808) is a distinct name.

## EPIC-FLATTEN — delete `flooring/` + `management/` area folders
**Verdict: the split is purely cosmetic — nothing depends on it.** No tsconfig alias, no `package.json#exports` deep path, no eslint boundary rule (the arch-boundary test enforces *layers*, not areas), no CLAUDE.md contract, no area-barrel (root `index.ts` re-exports `./flooring/<module>/index.js` directly). **External blast radius = ZERO** (packages export only `.`/`./client`/`./errors`/`./prisma`; no consumer imports deep area paths — verified repo-wide). Internal churn: `git mv` 48 module dirs (+ mirrored `tests/`), rewrite ~45 root-barrel lines (drop the segment), depth-fix **88 src** + **158 test** escaping imports (drop one `../`; intra-module + same-area imports unaffected). 16 module names are mutually disjoint and none collides with a `shared/` file — flatten to `src/<module>/` is clean. Leave `shared/`, `queue(s)/`, `list-view/`, `seed/`, `generated/` in place.
- **Recommendation:** doesn't hurt today, low reward (shorter paths, one less nesting level). Do as ONE standalone mechanical commit when the tree is quiet — **do NOT interleave with EPIC-RENAME** (both rewrite every module tree; sequence them).

---

## ⚑ Flags — decide with the user
- ⚑ **Money-math fix scope (Dm3):** route `line-totals`/`record-summary` through the BigInt money standard, OR document them as display-only estimates? Behavior-affecting.
- ⚑ **PaletteColor guard (Dm3):** confirm whether the zod/API layer already validates `color` for entities/properties/templates/work-orders/payments before adding a domain guard.
- ⚑ **One Prisma-error home (X1):** consolidate `db` predicates into `errors.ts` vs keep `shared/prisma-errors.ts`?
- ⚑ **EPIC ordering:** do the contained dedupe/comment/robustness sweeps FIRST (higher value, lower risk), then RENAME, then FLATTEN? Or front-run RENAME while it's top-of-mind?
- ⚑ **Shared dev DB:** EPIC-RENAME migrations race sibling dev sessions (dev-1..4 share dev's `.env`) — coordinate schema timing.
- ⚑ **Over-abstraction guard:** Dm1 deliberately leaves per-module error classes, item-row normalizers, and field-predicate factories alone (per the user's pressure-test-over-abstraction stance). Confirm.
