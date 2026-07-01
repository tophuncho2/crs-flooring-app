# Product UoM & Category Backbone — FK Migration Epic

> **Supersedes** the earlier "UoM Schema Cleanup & Send-Unit Removal" plan, which kept
> inventory/adjustments/staged on **frozen snapshot strings** and made template/WO items
> **live-resolve** off the product. This version replaces both with **per-row unit FKs**.
> Validated end-to-end against live code 2026-07-01 (six-module read); scoped-down with user
> the same day (see "Deliberately deferred").

## Vision

Make `FlooringUnitOfMeasure` (and eventually `FlooringCategory`) the **backbone** of the catalog:
one canonical unit table, referenced by a real FK from every row that carries a unit. Send unit is
dead weight (every category's `sendUnitSlug === stockUnitSlug`) and is deleted, not migrated. Post
cleanup there is exactly **one unit of measure per row**, so the field is named honestly: **`unitId`**
(relation `unit`) — the old "stock unit" prefix implied a contrast (send vs stock) that no longer
exists.

This epic is the databasing foundation for later work (per-row conversion / alternative stock
balance; the invoicing / planned-expense sections on templates + work orders). None of that ships
here — this epic only lays the FK groundwork plus one dormant column (`product.coverageUnitId`) so
the future conversion plan has its anchor already in place.

---

## Confirmed decisions (locked with user 2026-07-01)

1. **Inventory `unitId` is set at create and immutable thereafter** — same lifecycle as today's unit
   snapshot strings. It is chosen on the manual create form, or written by the worker from the staged
   row at materialize. **No adjustment-existence lock in this plan** (that editability-before-first-
   adjustment behavior is a separate future plan).
2. **Adjustment unit = FK** (not frozen snapshot). Stamped at create from the inventory row's
   `unitId`. Since inventory's unit never changes post-create, the value is stable; a UoM rename is a
   label correction, not a meaning change, and UoM deletes are blocked while linked — history stays
   coherent, and adjustments stay on the same FK model as everything else.
3. **Naming = `unitId` / relation `unit`** for the primary unit on every model (product, inventory,
   adjustment, staged row, filter row, template item, WO item). Coverage's dormant pair is
   `coverageUnitId` / `coverageUnit` (product only).
4. **Split into four sequenced sub-plans (2A→2D)**; migrations run in strict order on the shared dev
   DB (see the migration spine).
5. **Template + WO item `unitId` is nullable** (mirrors the already-nullable item `quantity` — a
   half-drafted line needn't carry a unit).
6. **Build the UoM `/options` picker stack first** (front of 2A) so the product Unit field is
   editable immediately — no throwaway read-only phase.
7. **Category slug is dropped entirely.** No slug column, no `slugify`. Normalized-unique names are
   enforced by a **case-insensitive unique index on `name`** (`lower(name)`) + a light
   `normalizeCategoryName` (trim + collapse whitespace, preserve case) on write. The legacy
   `vinyl-plank`/`Plank` slug just goes away.
8. **Backfill scripts are kept until main is done** (not deleted after the dev run). Main runs the
   same safe expand→backfill→contract and is where the temporarily-kept columns finally get torn out.
9. **UoM display is a per-render-site, build-time choice** (name *or* abbrev, never both in one cell)
   — see the rendering matrix. No user preference, no toggle.

### Driven decisions (Claude's call — flagged, override if wrong)

- **Template/WO item unit = its own editable FK**, seeded from the product's `unit` at add-time;
  **sync copies the FK** template→WO (no product re-resolve).
- **Product `categoryId` becomes mutable** — its immutability rationale was purely the snapshots
  we're deleting (`product-rules.ts:48-62`), so it's safe. **One wrinkle:** the stored `product.name`
  is composed from the category name (`buildStoredFlooringProductName`), so a category change must
  **recompose `product.name`** in `update-product` (see 2A) or the name goes stale.
- **Worker reads the staged row's `unitId`**, not the product — today it re-derives from `product`
  (`materialize-imported-rows.ts:51-54`); that must change.
- **Staged rows + filter rows keep an editable `unitId`** — but only within the row's existing edit
  window (while DRAFT, before status flips to QUEUED/IMPORTED); the unit follows the same editability
  lifecycle as the other staged fields. It freezes for good once it lands on an inventory row.

### Deliberately deferred (NOT in this epic)

- **Coverage / conversion feature** — except the one dormant `product.coverageUnitId` FK column
  (schema + relation only; nullable, unwired, unsurfaced). `coveragePerUnit` already exists and
  stays. Everything else (coverage on inventory/staged, the alt-balance conversion column, any UI)
  is its own future plan.
- **Rank gating** — the "categories/UoM rows editable only by TIER_1+" restriction is a future plan.
  2D ships the CRUD **ungated** (normal auth/rate-limit gauntlet only); the tier-1 guard is noted as
  the intended follow-up but not built here.
- **Editable-inventory-unit-before-adjustment** — future plan (see decision 1).

---

## The unit model

| Row | `unitId` | Editable? | Notes |
|---|---|---|---|
| **Product** | FK, NOT NULL | Always | Catalog source of truth; seeds the others. Also gains dormant `coverageUnitId` (nullable, unwired). |
| **Inventory** | FK, NOT NULL | **Create-only**, immutable after | From form on manual create; from staged row via worker at materialize |
| **Adjustment** | FK, NOT NULL | No (ledger) | Stamped at create from `inventory.unitId` |
| **Staged inventory row** | FK | Editable in staging | Seeded from product; **worker materializes it forward** to inventory |
| **Staged filter row** | FK | Editable in staging | Balance math is unit-agnostic; mixing units allowed |
| **Template item** | FK | Always | Seeded from product `unit`; replaces `sendUnit*` |
| **WO item** (Requested Material) | FK | Always | Sync copies FK from template item |

Requested/remaining balances (imports) and quantities remain **unit-agnostic numbers** — mixing
units across rows is a deliberate user choice, not a system conversion
(`computeFilterRemainingStock`, `staged-inventory-filter-rows/types.ts:41-57`).

### Seeding principle — the product seeds the unit; each row edits it within its own window

The **product** is the catalog source of truth for the unit: a user sets the canonical `unitId` on
the product, and **everywhere a product is selected, picking (or changing) that product seeds its
`unitId` into that row's unit FK picker.** The product-pick is the seeding *trigger*; from there the
seeded value **stays editable for exactly as long as that row's lifecycle allows edits**, then locks
per the unit-model table above. "Seed + editable" means *seed on product-select, then editable
within that row's own edit window* — **not** "editable forever everywhere."

| Where a product is picked | Seed trigger | Editable window after seeding |
|---|---|---|
| Inventory manual create | on product-pick in the create form | **create only**, then frozen (immutable after) |
| Staged inventory row / filter row | on product-pick (add) or product-change (modify) | **while DRAFT** (before QUEUED/IMPORTED); frozen once it materializes onto an inventory row |
| Template item / WO item | on product-pick / product-change | **always** (seeds from `product.unit`, user may override; sync copies the FK) |

**Re-seed vs. preserve.** Changing the picked product re-seeds the unit from the new product (a new
product is a new default meaning); editing the unit alone, without changing the product,
**preserves the user's override**. The WO material-items save already models this exactly — its
`productChanged` guard re-snapshots only when the product actually changed
(`save-work-order-material-items-section.ts:119-139`); every FK site in 2B/2C follows the same
trigger. This supersedes today's blunter behavior, where staged-row modify drops the unit entirely
and template modify re-stamps it on every save.

---

## UoM rendering — name vs abbreviation (per-site, fixed)

Every unit FK resolves both `{name, abbreviation}` for free. Each render site shows **exactly one**
(never both in a cell — that's crowding). This is a build-time decision baked into each render swap,
NOT a user toggle. Thread this matrix through the render tasks in 2A/2B/2C.

| Render site | Show |
|---|---|
| Product form — Unit picker/field | **Name** |
| Category / UoM pickers — option labels | **Name** |
| UoM management list — `name` & `abbreviation` as **separate columns** | Both (separate cells) |
| Products list — unit column | Abbrev |
| Inventory create + detail — stock / balance / net suffixes | Abbrev |
| Inventory list — unit column | Abbrev |
| Adjustments — qty / unit display | Abbrev |
| Import staged + planned grids — unit cell | Abbrev |
| Template + WO requested-material grids — unit cell | Abbrev |
| WO print file — unit column | Abbrev |

**Rule:** pickers + the product Unit field render the **name**; every inline suffix / dense grid /
list cell renders the **abbreviation**.

---

## End-state schema

| Model | Change |
|---|---|
| `FlooringUnitOfMeasure` | Keep seeded data. **Drop** `sendUnitCategories`/`stockUnitCategories` relations. **Add** inverse relations for every new FK (products, inventory, adjustments, staged rows, filter rows, template items, WO items, + product coverage). **Drop the `slug` column**; case-insensitive unique `name` **and** unique `abbreviation` (both `lower()`), same treatment as category. User-managed CRUD in 2D. |
| `FlooringProduct` | **+`unitId`** (NOT NULL, FK→UoM Restrict, indexed) **+`coverageUnitId`** (nullable FK→UoM Restrict, **dormant**). **Drop** `sendUnitName/Abbrev`, `stockUnitName/Abbrev`. `coveragePerUnit` stays. `categoryId` becomes **mutable**. |
| `FlooringInventory` | **+`unitId`** (NOT NULL FK, create-only). **Drop** `sendUnitName/Abbrev`, `stockUnitName/Abbrev`. |
| `FlooringInventoryAdjustment` | **+`unitId`** (NOT NULL FK, immutable). **Drop** `stockUnitName/Abbrev`. |
| `FlooringImportStagedInventoryRow` | **+`unitId`** (FK, editable in staging). **Drop** `stockUnitName/Abbrev`. |
| `FlooringImportStagedInventoryFilterRow` | **+`unitId`** (FK, editable in staging). **Drop** `stockUnitName/Abbrev`. |
| `FlooringTemplateItem` | **+`unitId`** (FK, editable). **Drop** `sendUnitName/Abbrev`. |
| `FlooringWorkOrderItem` | **+`unitId`** (FK, editable). **Drop** `sendUnitName/Abbrev`. |
| `FlooringCategory` | **Drop** `sendUnitId`, `stockUnitId` (+ indexes + relations). **Drop the `slug` column** (+ its `@unique`). Replace `name @unique` with a **case-insensitive unique index** on `lower(name)`; no user-facing slug. User-managed CRUD in 2D. |

Schema file: `packages/db/prisma/schema.prisma`. Current locations:
Product 249-289, Category 218-234, UoM 236-247, Inventory 291-355, Adjustment 435-497,
StagedRow 357-388, FilterRow 390-408, TemplateItem 588-607, WOItem 707-728.

---

## Migration & promotion model

**No direct edits to main, ever.** The epic executes on dev, is promoted dev → staging → main, and
only *after* it's live on main and verified does the destructive cleanup run — itself promoted
through the same chain. Standard **expand → migrate → contract**, with contract deferred to the very
end so the old snapshot columns + scripts stay as a fallback the whole way up.

Two non-obvious operational rules:
- **Backfill is a manual step BETWEEN migrations.** Per env: deploy the expand migration → run the
  backfill `--apply` → verify zero unresolved → *then* deploy the NOT-NULL/FK migration. Promotion is
  **staged per env**, not "merge and deploy everything at once" — a NOT-NULL migration must never
  reach an env before that env's backfill has run.
- **Shared dev DB** — dev-1/2/3 share one database; expand migrations land for all three at once.

### Phase E — Expand & migrate (during the epic; promoted through)
Additive + non-destructive; old snapshot columns stay populated as the fallback.
- **2A-E:** +`product.unitId?` +`product.coverageUnitId?` (nullable) + UoM `products` relation → run
  `backfill-product-unit.js` (`product.stockUnitName → UoM.name`; dev 100%/223, fallback
  `category.stockUnitId`, anomaly-guard) → `product.unitId SET NOT NULL` + FK Restrict + index.
  `coverageUnitId` stays nullable/dormant. Category unlock = code only.
- **2B-E:** +`unitId?` on inventory / adjustment / staged / filter → run `backfill-row-units.js` (each
  row's own `stockUnitName → UoM.name`) → `SET NOT NULL` on inventory + adjustment `unitId` + FKs +
  indexes (staged/filter may stay nullable-tolerant).
- **2C-E:** +`templateItem.unitId?` +`WOItem.unitId?` → run `backfill-item-units.js`
  (`item.sendUnitName → UoM.name`, fallback `product.unitId`) → FKs + indexes; `unitId` stays
  **nullable** (mirrors nullable `quantity`).
- **2D-E:** add the case-insensitive unique indexes — `lower(name)` on category; `lower(name)` **and**
  `lower(abbreviation)` on UoM (additive — verify no existing dupes first). CRUD + name-normalization
  + render swaps = code.
- **All code ships in Phase E:** write/read the new FKs, stop reading snapshot columns, category
  unlock + `product.name` recompose, CRUD, render per the rendering matrix.

### Phase C — Contract & cleanup (ONLY after the epic is live on main + verified; promoted through)
The single destructive step, done last, everywhere via the promotion chain.
- **Drop** `stockUnitName/Abbrev` + `sendUnit*` on product / inventory / adjustment / staged / filter;
  **drop** `sendUnit*` on template + WO items.
- **Drop** `category.slug` (+ `@unique`) and the old `category.name @unique`; **drop**
  `category.sendUnitId`/`stockUnitId` (+ indexes + relations); **drop** UoM `slug` + the old
  `sendUnitCategories`/`stockUnitCategories` relations.
- **Delete** the three backfill scripts + their npm wiring.

**FK/index convention** (verified vs history): FK `{table}_{col}_fkey`, index `{table}_{col}_idx`,
`ON DELETE RESTRICT ON UPDATE CASCADE` for required FKs (matches `product.categoryId`,
`inventory.productId`, `adjustment.productId`).

**Backfill script convention** (from deleted `backfill-coverage-to-stock.js @ 7da59e8^`): CommonJS
`.js` via `node -r dotenv/config`; `createPrismaClient()` from `@builders/db`; dry-run default,
`--apply` to mutate; single `$transaction(fn,{timeout:120_000})`; idempotent (`WHERE …Id IS NULL`);
padded per-table + TOTAL report; `module.exports` for unit tests; npm delegate in
`packages/db/package.json` + root.

---

## Sub-plan 2A — Product unit FK (+ dormant coverage FK) + category unlock

**Goal:** product owns a real `unitId` FK; a dormant `coverageUnitId` column exists for the future;
category becomes mutable; product snapshot strings still present (dropped in 2B) but no longer
authoritative.

**Schema/seed**
- [ ] `schema.prisma` — add `unitId` + `coverageUnitId` + relations to `FlooringProduct`; `products`
      back-relation on `FlooringUnitOfMeasure`.
- [ ] `packages/db/scripts/backfill-product-unit.js` + npm wiring.

**Domain**
- [ ] `products/types.ts` — `ProductCreateForm`/`ProductUpdateForm` gain `unitId`; **`ProductUpdateForm`
      stops `Omit`-ing `categoryId`** (now mutable). `coverageUnitId` **not** added to the forms
      (dormant).
- [ ] `products/product-rules.ts:64-73` — **delete** `isProductCategoryChangeBlocked` +
      `buildProductCategoryChangeBlockedMessage`.
- [ ] `products/unit-snapshot.ts` — retire `buildProductUnitSnapshotsFromCategory` (unit chosen
      directly, not derived from category). Keep until 2B swaps create-inventory's source.

**Data**
- [ ] `products/shared.ts:11-47` — add `unit {id,name,abbreviation}` to `productRowSelect`/
      `productOptionSelect`; expose `unitId` + resolved `unit` on the records/option.
- [ ] `products/write-repository.ts:20-52` — `CreateProductInput` gains `unitId`; **remove `categoryId`
      from `ImmutableProductFields`**; `updateProduct` patches `unitId` + `categoryId`. `coverageUnitId`
      accepted at neither (dormant; nullable, written by no one yet).

**Application**
- [ ] `create-product.ts:69-93` — stop deriving unit snapshot from category; set `unitId` from input.
- [ ] `update-product.ts:38-42,69` — drop the "category immutable" comment; patch `categoryId` +
      `unitId`. **When `categoryId` changes, recompose the stored `product.name`** via
      `buildStoredFlooringProductName` (the name embeds the category name — else it goes stale).

**API**
- [ ] `products/_validators.ts:96-122` — **delete** the `PRODUCT_CATEGORY_LOCKED` rejection; accept
      `categoryId` on update; accept `unitId` (required) on both. `coverageUnitId` not accepted.

**Module dir / pages**
- [ ] `product-primary-fields-section.tsx:142-155,168-172` — Category becomes an editable
      `CategoryPicker` in detail (not `StaticFieldValue`); Unit becomes the **new UoM picker**
      (see cross-dependency); **Send Unit field deleted**. Coverage cell unchanged.
- [ ] `products-list-columns.ts` / `products-row-cell.tsx` — drop `sendUnit` col; `unit` resolves
      from the FK.
- [ ] `products/data/mutations.ts:15-20` — stop stripping `categoryId` from the PATCH body.

> **Cross-dependency:** the editable product Unit picker needs the **UoM `/options` picker** stack
> built in 2D. Build that picker stack as the *first* task of 2A so the product form is fully
> editable immediately (rather than shipping a read-only unit and flipping it later).

**Exit:** `/check` green; products read/write `unitId`; category editable; `coverageUnitId` present
but untouched.

---

## Sub-plan 2B — Inventory + adjustments + staged: unit FK + worker rewrite

**Goal:** inventory/adjustments/staged move off snapshot strings onto `unitId` FKs. Inventory unit is
create-only (immutable after). Staged rows stay editable in staging. Worker copies the staged row's
unit forward. **No coverage, no lock machinery** (both deferred).

**Schema**
- [ ] Add the 2B `unitId` columns — **Phase E** (nullable → backfill → NOT NULL + FK + index). The
      snapshot columns are **dropped in Phase C**, not here.
- [ ] `backfill-row-units.js` + npm wiring.

**Domain**
- [ ] `inventory/editability.ts:1-23` — swap the unit strings in `INVENTORY_IMMUTABLE_FIELDS` for
      `unitId` (stays immutable post-create — no conditional predicate, no adjustment lock).
- [ ] `inventory/create-rules.ts:34-39,156-181` — `CreateInventoryProductSnapshot` carries `unitId`
      (from product), not unit strings.
- [ ] `inventory/types.ts` — `InventoryRow` gains `unitId` + resolved `unit`, drops unit strings.
- [ ] adjustments `types.ts` + `pending-adjustment-inventory-snapshot.ts` — adjustment carries
      `unitId` (from inventory), not `stockUnitName/Abbrev`.

**Data**
- [ ] `inventory/shared.ts:6-48` + `read-repository.ts:57-104` — select `unit` relation; normalize FK.
- [ ] `inventory/write-repository.ts:34-59,267-328` — `MaterializeInventoryRowFields` +
      `materializeStagedRowsToInventory` insert `unitId`.
- [ ] `inventory/read-repository.ts` `listInventoryOptions` — source option subtitle unit from
      `product.unit` (was category).
- [ ] adjustments `shared.ts:5-38` + `write-repository.ts:36-39,175-187` — select `unit`; stamp
      `unitId` at create; keep it in the immutable-on-update set.
- [ ] staged rows `shared.ts` + read/write repos — select/write `unitId`; **update input now INCLUDES
      `unitId`** (today it's immutable, `write-repository.ts:43-52`).
- [ ] staged filter rows read/write — select/write `unitId`; editable.

**Application**
- [ ] `create-inventory.ts:56-64` — snapshot `unitId` from **`product.unit`** FK (not `product.stockUnitName`).
- [ ] `merge-inventory.ts` — same source flip (if still live).
- [ ] `create-pending-adjustment.ts:122-125` — stamp `unitId` from `inventory.unitId`.
- [ ] `update-pending-adjustment.ts` — leave unit out of the editable patch (ledger).
- [ ] `save-import-staged-inventory-section.ts:127-142,179-227` — seed `unitId` from product on add;
      on modify, **re-seed only when the product changes** (mirror the WO `productChanged` guard),
      otherwise **preserve the user's edited `unitId`** — today modify drops the unit entirely
      (`:236-247`), so it becomes an editable, product-seeded field.
- [ ] **`materialize-imported-rows.ts:44-67`** — the linchpin: read `row.unitId` (**not**
      `row.product.*`); `stagedInventoryRowSelect` for materialization selects the staged `unitId`.

**Module dir / pages**
- [ ] `inventory-create-fields.tsx` — add the UoM picker (editable at create only), seeded from the
      picked product.
- [ ] `inventory-primary-fields-section.tsx` — unit resolves from FK; read-only in detail (create-only).
- [ ] `import-staged-inventory-grid.tsx` + `import-planned-imports-grid.tsx` +
      `use-import-filter-rows.ts` + `drafts.ts` — unit cell becomes an **editable** picker on staged +
      filter rows (today read-only).
- [ ] Inventory list/CSV — `unit` resolves from FK; no visible change beyond source.

**Exit:** `/check` green; grep: no `stockUnitName/Abbrev` or `sendUnit*` reads on
inventory/adjustment/staged/product; worker carries staged units; inventory unit fixed post-create.

---

## Sub-plan 2C — Template + WO item unit FK + sync

**Goal:** each material item owns an editable `unitId` FK, seeded from the product; sync copies the
FK. Items only ever had `sendUnit*` today — no stock unit.

**Schema**
- [ ] Add `templateItem.unitId?` + `WOItem.unitId?` (mig spine 2C); backfill from `item.sendUnitName`.

**Domain**
- [ ] `templates/material-items/{types,normalizers}.ts` + `work-orders/material-items/{types,normalizers}.ts`
      — replace `sendUnitName/Abbrev` with `unitId` + resolved `unit`.
- [ ] `work-orders/file-generation/types.ts` — map `unitAbbrev` from the item's `unit`.
- [ ] **Delete** `products/item-send-unit-snapshot.ts` + all `buildItemSendUnitSnapshotFromProduct`
      call sites (template save :83, WO save :106).

**Data**
- [ ] template MI read-repo (:7-19) + template detail nested (:89-104) + WO MI read-repo (:10-22) +
      WO file-gen (:523-538) — select `unit`; product already joined (zero N+1 — free nested select).
- [ ] template + WO MI write-repos — write `unitId`.

**Application**
- [ ] `save-template-material-items-section.ts` + `save-work-order-material-items-section.ts` — on
      add/product-change, seed `unitId` from `product.unitId`; allow user override; stop stamping
      unit strings.
- [ ] **`sync-template-to-work-order.ts:86-93`** — copy `unitId` template item → WO item (verbatim,
      like today's `sendUnit*` copy at `write-repository.ts:120-121`). **Don't forget this.**

**Module dir**
- [ ] `template-material-items-section.tsx` + `work-order-requested-material-grid.tsx` +
      controllers/drafts — item unit becomes an editable UoM picker cell; subtitle reads `unit`.
      (Section label "Requested Material" unchanged — `MODE_LABEL`, `work-order-material-items-section.tsx:47-49`.)

**Exit:** `/check` green; items carry editable `unitId`; sync propagates it; no `sendUnit*` left.

---

## Sub-plan 2D — Strip category units + user-managed Category & UoM CRUD (ungated)

**Goal:** sever category↔unit, then make both backbone tables user-managed CRUD, with a
no-delete-while-linked rule (DB already `Restrict`s; app mirrors it). **Rank gating is NOT built here**
— it's a future plan; note the tier-1 guard as the intended follow-up.

**Schema/seed**
- [ ] **Phase E:** add the case-insensitive unique indexes — `lower(name)` on category; `lower(name)`
      + `lower(abbreviation)` on UoM. The category-unit / `slug` / old-`name @unique` / UoM-relation
      **drops are Phase C** (post-main).
- [ ] `seed/categories.ts` — drop `sendUnitSlug`/`stockUnitSlug` **and the `slug` field** (column
      gone); seed `name` only (normalized). The legacy `vinyl-plank`/`Plank` slug is simply removed.

**Name normalization (replaces slug)**
- [ ] Add `normalizeCategoryName` in `domain/.../categories/normalizers.ts` — trim + collapse internal
      whitespace, **preserve case** (display-faithful). Apply on create + update. (Same for UoM if
      confirmed.) No `slugify`, no slug column.
- [ ] Uniqueness enforced by the DB case-insensitive index (2D-mig); map its P2002 via `isP2002` →
      typed 409 on `name`.
- [ ] Staged filter rows — **drop the `categoryFilterSlug` computation** from the read-repo + type
      (`staged-inventory-filter-rows` read normalizer :59-60); it's dead once `category.slug` is gone.

**UoM picker stack (net-new — build early; 2A depends on it)**
- [ ] `unit-of-measures/types.ts` — `UnitOfMeasureOption {id,name}`.
- [ ] `unit-of-measures/read-repository.ts` — `searchUnitOfMeasureOptions(search,skip,take)` (`take+1`,
      case-insensitive) alongside `listUnitOfMeasuresForListView`.
- [ ] `search-unit-of-measure-options.ts` use case (clamp 1–50, default 20).
- [ ] `api/unit-of-measures/_validators.ts` + `options/route.ts` — GET, full gauntlet, **ungated**.
- [ ] `unit-of-measures/data/unit-of-measure-options-request.ts` +
      `components/picker/unit-of-measure-picker.tsx` (`AsyncRichDropdown` on `@/engines/picker`).

**Category + UoM CRUD (mirror product CRUD, ungated)**
- [ ] `categories/write-repository.ts` + `unit-of-measures/write-repository.ts` — `create/update/delete`;
      create+update store the **normalized `name`** (no slug); map P2002 (on the `lower(name)` index)
      → typed 409 on `name`.
- [ ] `application/.../{create,update,delete}-{category,unit-of-measure}.ts` — **delete guards count
      ALL referrers**: Category ← `product.categoryId` + `filterRow.categoryFilterId`; UoM ← every FK
      added this epic (product `unitId`, product `coverageUnitId`, inventory, adjustment, staged,
      filter, template item, WO item). Block if any > 0; 409 with a pluralized message.
- [ ] domain `*-rules.ts` + zod — validate `name` (+ `abbreviation` for UoM); dedup keys off the
      normalized name (case-insensitive).

**API (ungated — normal gauntlet only)**
- [ ] `POST/PATCH/DELETE /api/categories` + `/api/unit-of-measures` — `applyRoutePolicy` →
      `enforceMutationRateLimit` → idempotency → validator → use case. **No `enforceManageUsersAccess`
      in this plan** (deferred).

**Module dir / pages**
- [ ] category + UoM `controllers/` + `components/record/` + `data/mutations.ts` + list create/delete
      wiring (mirror products). Forms expose `name` only (+ `abbreviation` for UoM); slug internal.
- [ ] `category-picker.tsx:39` — drop the slug subheader (title = name only).
- [ ] `products/read-repository.ts:279` — `orderBy: category.slug` → `category.name`.

**Exit:** `/check` green; category ⊥ unit; both tables CRUD-able; delete blocked while linked; manual
run confirms the full loop.

---

## Risks & watch-items

- **Shared dev DB** — every migration hits dev-1/2/3 at once; run the spine in strict order.
- **Backfill gates NOT NULL** — each `SET NOT NULL` contract-mig must not run until its backfill
  reports zero unresolved rows on that env.
- **Worker source flip is behavioral** — after 2B the worker materializes the *staged row's* unit;
  before 2B it re-derives from product. A staged row created pre-2B (no `unitId`) must be backfilled
  before the worker rewrite goes live, or materialize will null the unit.
- **UoM gains ~9 inverse relations** — the 2D delete guard must enumerate every one, or a "safe
  delete" will orphan/break a referrer the guard forgot.
- **Adjustment FK vs history** — accepted: a UoM rename re-labels historical adjustments. Mitigated by
  inventory unit being fixed post-create + no-delete-while-linked.
- **Mixed units across import rows** — accepted by design; balances are unit-agnostic. Worth a
  first-run sanity check on real data.
- **Ungated CRUD (interim)** — until the future rank-gating plan lands, any authenticated user can
  create/edit/delete backbone rows. Acceptable per user; flagged so it isn't forgotten.

## Tests

**Will break (update in the relevant sub-plan):** the prior 13-file set still applies — inventory
`create-rules`, `create-inventory`, `merge-inventory`, adjustments create/update/delete, imports
materialize + save-section + mark-for-import, WO file-gen adjustments, inventory adjustment identity,
product-display-name. Plus new item-unit tests (template/WO material-items save + sync).

**Add:** each backfill script's `module.exports` (name-match / fallback / anomaly-guard); UoM
`searchUnitOfMeasureOptions` paging; category + UoM CRUD (slug derivation + regenerate-on-rename,
P2002→friendly 409, delete-blocked-while-linked across every referrer); worker carries staged unit.

## Remaining open questions

_All design decisions resolved as of 2026-07-01._ UoM gets the same slug-drop as category, and its
`abbreviation` is case-insensitive unique too. Remaining unknowns are execution-time details noted
inline in each sub-plan (e.g. dupe-check before adding the `lower()` unique indexes).
