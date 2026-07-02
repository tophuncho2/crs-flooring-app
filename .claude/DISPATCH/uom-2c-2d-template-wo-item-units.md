# uom-2c-2d-template-wo-item-units — carry the UoM FK migration through material items (2C), then category-unit strip + Category/UoM CRUD (2D)

## How to use this brief (receiving session, read first)
You are a fresh session on the `dev-3` worktree, continuing the **Product UoM & Category Backbone FK-migration epic** (`.claude/DEVELOPER-PLANS/2-PRODUCT-UOM.md`). This brief is a high-confidence, code-validated map — NOT a substitute for reading the code.

1. **FIRST run `/session-new`** to do your own end-to-end research and validate this brief against the live code. Trust the code over this file if they disagree, and note the discrepancy.
2. **Read the ⚑ Flags** — open decisions to settle with the user as you work. They are deliberately NOT pre-decided.
3. **Deliverable order:** bring the user the **2C plan** first (all layers, all flags surfaced) and get approval before executing. 2D is the follow-on sub-plan in the same session once 2C lands + is `/check` green. Honor mode: PLAN → plan and stop; AUTO → execute — but research-and-validate first either way.
4. **The recent commits tell most of the story — read them before planning:**
   - `b3285449` UoM **2B** (inventory/adjustment/staged/filter rows + worker) — the pattern you're mirroring
   - `a13f3a5e` backfill fetch-all+JS-filter gotcha
   - `237744e1` UoM **2A** (product `unitId` FK + UoM picker stack + mutable category)
   - `311ae9b4` / `358edf30` the plan re-architecture + seeding principle

## Intent for this session
Move the **last two models still on frozen unit snapshot strings** — `FlooringTemplateItem` + `FlooringWorkOrderItem` — onto a real editable `unitId` FK (**2C**), then **strip the category-level `stockUnitId`/`sendUnitId` + `slug` and ship user-managed Category & UoM CRUD** (**2D**). "Done" = both material items carry an editable, product-seeded `unitId`; template→WO sync propagates it; no `sendUnit*` left as authoritative; category units gone; Category/UoM CRUD live; `/check` green.

> **Status of the epic you're continuing:** 2A + 2B are DONE, committed, and their migrations RUN on the shared dev DB. **The user just pushed `dev-3` and is waiting for the green deploy to test the 2B UX in-app.** Treat 2B as landed-but-unverified. **If the user reports a 2B UX bug when they return, it jumps the queue ahead of 2C.**

## ⚑ Flags — decisions to make / potential gaps (settle with the user while you work)
- ⚑ **2C migration is nullable-only** — item `unitId` mirrors the already-nullable `quantity` (`schema.prisma:632` template, `:752` WO), so 2C is **expand + backfill, NO `SET NOT NULL` step** (unlike 2A/2B's two-file spine). Confirm and author accordingly.
- ⚑ **Template save currently has NO `productChanged` guard** — it re-stamps every modified row (`save-template-material-items-section.ts:98`), while the WO side already guards (`save-work-order-material-items-section.ts:119-139`). Decide: adopt the WO guard verbatim on the template side so editing a template item's unit alone preserves the override (the 2B staged/filter path made the same call).
- ⚑ **Sync copies `unitId` in TWO places** — `sync-template-to-work-order.ts:89-90` (use-case input map) **and** `packages/db/src/flooring/work-orders/write-repository.ts:120-121` + its input type `:86-87` (the DB write). Miss either and template→WO sync drops the unit. The plan flags this as the easy miss.
- ⚑ **Template detail select lives in TWO files** — the read-repo detail (`read-repository.ts:89-104`, plan-cited) **and** a second `templateDetailSelect` in `packages/db/src/management/templates/write-repository.ts:26-68` (items `sendUnit` at `:61-62`) that `create/updateTemplateRecord` return through. Both need `unit` added or create/update returns a null-unit item. (Uncited by the plan — verify.)
- ⚑ **WO grid editable-cell shape** — the WO requested-material grid renders the unit as a plain read-only suffix (`work-order-requested-material-grid.tsx:73`), not a DataTable picker cell. Decide whether to restructure it to the proven editable-picker column pattern (`import-planned-imports-grid.tsx:64-72`).
- ⚑ **2D `abbreviation` uniqueness** — `FlooringUnitOfMeasure.abbreviation` is NOT `@unique` today (`schema.prisma:240`); 2D adds a `lower(abbreviation)` unique index → **check for existing dupes on the shared dev DB before adding it.**

## Scope
**In (2C):** `unitId` FK on `FlooringTemplateItem` + `FlooringWorkOrderItem`, all layers domain→data→app→api→module; delete the item send-unit snapshot; sync copies the FK; editable UoM picker cell in both item grids.
**In (2D):** strip `FlooringCategory.stockUnitId`/`sendUnitId` + `slug` (+ `slugify`/`categoryFilterSlug`); add `normalizeCategoryName`; build net-new Category + UoM CRUD (write-repos, use cases, routes, management UI) — **ungated** (normal auth/rate-limit gauntlet; tier-1 guard only noted, not built).
**Out:** the two **sacred adjustment create modals** (untouched). **Phase C** column drops — do NOT drop the retained frozen `stockUnit*`/`sendUnit*` columns anywhere; they stay as the transition fallback until post-main. Inventory/adjustment/staged/filter (done in 2B).

## Layer-by-layer map — Sub-plan 2C (anchors verified against live code)
```
Schema      packages/db/prisma/schema.prisma
              FlooringTemplateItem :626-645 (sendUnit :633-634, quantity? :632) — +unitId? +unit rel FlooringTemplateItemUnit +@@index
              FlooringWorkOrderItem :745-764 (sendUnit :753-754, quantity? :752) — +unitId? +unit rel FlooringWorkOrderItemUnit +@@index
              FlooringUnitOfMeasure :243-250 — add templateItems + workOrderItems inverse relations (8→10)
Domain      packages/domain/src/management/templates/material-items/{types.ts:10-11, normalizers.ts:24-25}  — sendUnit→unitId+unit
            packages/domain/src/flooring/work-orders/material-items/{types.ts:6-7, normalizers.ts:25-26}     — sendUnit→unitId+unit
            packages/domain/src/flooring/work-orders/file-generation/types.ts:58 — unitAbbrev (value mapped in DATA, see below)
            DELETE packages/domain/src/flooring/products/item-send-unit-snapshot.ts (buildItemSendUnitSnapshotFromProduct :26) + barrel index.ts:4
Data(read)  packages/db/src/management/templates/material-items/read-repository.ts:7-19 (product joined :10 → free unit nested select)
            packages/db/src/management/templates/read-repository.ts:89-104 (detail nested)
            packages/db/src/management/templates/write-repository.ts:26-68 (2nd templateDetailSelect, items :61-62 — ⚑)
            packages/db/src/flooring/work-orders/material-items/read-repository.ts:10-22
            packages/db/src/flooring/work-orders/read-repository.ts:523-538 (file-gen select; unitAbbrev projected :546 from :533 — source from unit rel)
Data(write) packages/db/src/management/templates/material-items/write-repository.ts (createMany :66-67, update :81-82)
            packages/db/src/flooring/work-orders/material-items/write-repository.ts (createMany :83-84, product-changed update :102-103)
App         packages/application/src/management/templates/material-items/save-template-material-items-section.ts (snapshot :60-84, unconditional apply :98 — ADD guard ⚑; delete-import :10, call :83)
            packages/application/src/flooring/work-orders/material-items/save-work-order-material-items-section.ts (guard exists :78-81,:119-139; delete-import :11, call :106)
            packages/application/src/flooring/work-orders/sync-template-to-work-order.ts:86-93 (copy unitId :89-90 ⚑)
            packages/db/src/flooring/work-orders/write-repository.ts createWorkOrderFromTemplateRecord (input type :86-87, createMany copy :120-121 ⚑)
Module      apps/web/modules/work-orders/components/record/material-items/work-order-requested-material-grid.tsx:73 (read-only suffix → editable picker cell ⚑)
            apps/web/modules/templates/components/record/material-items/template-material-items-section.tsx:116,:129
            WO controllers: controllers/record/material-items/{drafts.ts:25,40 ; types.ts:9 ; use-work-order-material-items-drafts.ts:88,93 (seeds sendUnitAbbrev from picked product — switch to unitId)} + controllers/record/drafts.ts:25
            Template controllers: controllers/record/material-items/use-template-material-items-section.ts:27,47,172
            Section label MODE_LABEL work-order-material-items-section.tsx:46-48 ("Requested Material") — UNCHANGED
API         both material-items section validators — accept item unitId
```
**Backfill:** clone `packages/db/scripts/backfill-row-units.js` → `backfill-item-units.js` for both item tables: resolve `sendUnitName → UoM.name` (case-insensitive), fallback `product.unitId` (NOT NULL, `schema.prisma:262`). **Fetch-all + JS-filter `!row.unitId`** (the client rejects `where:{unitId:null}` during the expand window). Anomaly-guard; `module.exports`; npm wiring in `packages/db/package.json` + root.

## Layer map — Sub-plan 2D (lighter; validate surface first — some plan anchors are STALE)
- Strip `FlooringCategory.slug` (`schema.prisma:220`) + `stockUnitId`/`sendUnitId` (`:222-223`) + relations/indexes. Add `lower(abbreviation)` unique on UoM (⚑ dupe check). Add category `lower(name)` normalized-unique.
- Category-unit readers to clean: `products/read-repository.ts` (**orderBy `category.slug` is `:421`, plan says :279 — STALE**), `products/shared.ts`, `categories/read-repository.ts`, `products/types.ts`, `product-create-client.tsx`, seed `packages/db/src/seed/categories.ts`.
- `categoryFilterSlug`: `staged-inventory-filter-rows/read-repository.ts:60` + `shared.ts:10` + domain `types.ts:6`.
- Category-picker slug subheader: **`category-picker.tsx:56` (plan says :39 — STALE)**; also `:63` sendUnitAbbrev subtitle.
- `slugify` at `packages/application/src/shared/slug.ts` (drop); `normalizeCategoryName` = **net-new** (trim + collapse whitespace, preserve case).
- **CRUD is net-new** — no `categories/write-repository.ts`, no `unit-of-measures/write-repository.ts`, no create/update/delete use cases exist. Build write-repos + use cases + routes + management UI. UoM list/options read-repos + list UI already exist.

## Migration (user runs it — DO NOT run)
Author the SQL alongside the schema edit (`db:deploy` only applies pre-written files). **2C = nullable expand + backfill only (no not-null).** Staged sequence on the shared dev DB, same as 2A/2B: `db:migrate:status` first (flag any sibling pending folder) → expand `db:deploy` → `backfill-item-units --apply` after a zero-unresolved dry-run. **Do NOT run any migration until the user says GO.**

## 2B assets to REUSE (confirmed present)
- UoM picker `apps/web/modules/unit-of-measures/components/picker/unit-of-measure-picker.tsx`; `UnitOfMeasureOption = {id,name,abbreviation}` (`packages/domain/src/flooring/unit-of-measures/types.ts:13-17` — already carries `abbreviation`; the plan's 2D `{id,name}` note understates it).
- Editable UoM picker **column** pattern: `import-planned-imports-grid.tsx` (import `:7`, column `:17`, cell `:64-72` — `value={draft.unitId||null}`, `onChange→setField(...,"unitId",...)`, `onOptionSelected→setUnit(...)`).
- `backfill-row-units.js` — the clone target. **GOTCHA: never put `*/` inside a JSDoc comment in these CommonJS scripts — it closes the block comment and throws a SyntaxError when node `require`s it (bit us in 2B).**
- The WO `productChanged` re-seed guard (`save-work-order-material-items-section.ts:119-139`) — the exact pattern to copy onto the template side.

## Cleanups noticed (surface to the user during planning)
- Pre-existing lint warning `apps/web/modules/templates/components/record/primary/groups/template-property-unit-group.tsx:46 'onFieldChange' unused` — sits in a *template unit* component; eyeball it while you're in the template layer.
- Ask the user to enumerate the "couple small things" they mentioned before finalizing the plan.

## Watch out
- **Sacred:** the two adjustment create modals stay untouched. The WO **requested-material** grid is NOT sacred — normal edit target.
- **Optional-FK trick from 2B:** if any code synthesizes a material-item row literal (as the sacred WO-adjustment modal does for inventory rows), keep the new `unitId` optional on that row type so the literal still compiles. Verify whether item rows are ever synthesized before choosing required vs optional.
- **Dist-rebuild order:** removing the `item-send-unit-snapshot` barrel export + type changes require `@builders/domain` rebuilt before `db`/`application` typecheck sees them (build-before-typecheck; `/check` handles this).
- **Uncited readers the plan misses (from validation):** the 2nd `templateDetailSelect` in templates `write-repository.ts:26-68`; the frontend seeder `use-work-order-material-items-drafts.ts:88,93` (seeds `sendUnitAbbrev` from the picked product — switch to seeding `unitId`); file-gen `unitAbbrev` mapped in DATA (`work-orders/read-repository.ts:546`), not domain.

## Done means
- `/check` green (build + typecheck + lint + test) after 2C, and again after 2D.
- 2C: both material items carry editable `unitId`; sync propagates it; no `sendUnit*` authoritative; migration + `backfill-item-units.js` WRITTEN (not run).
- 2D: category units + slug gone; Category/UoM CRUD live (ungated); migration WRITTEN (not run).
- Commit message ≤17 words ready per sub-plan. **DO NOT COMMIT — the user commits. DO NOT run migrations — the user runs them.**

## Build state (measured this session, pre-handoff)
`npm run check` **PASS** — build ✅ · typecheck ✅ (8 pkgs) · lint ✅ (0 errors, 21 pre-existing warnings) · test ✅ **1,154 passed** (domain 437 · db 70 · app 340 · web 293 · relay 6 · worker 8). No code changed since; only the 2B migrations were run.
