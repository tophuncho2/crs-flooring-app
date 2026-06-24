# entity-types-model — build the new user-managed Entity Types CRUD vertical (cloned from job-types) + a first-of-its-kind reusable color palette badge

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (target `management/job-types` end-to-end as your mirror, across every layer) to do your own research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
Build a brand-new, user-managed `Entity Types` lookup model and its complete CRUD vertical, cloned wholesale from the `management/job-types` module (`FlooringJobType`, `JT-` row numbers): a user-editable lookup row with a generated row number, `*NumberInt` exact-int search, `createdBy`/`updatedBy` actor columns, and full create/read/update/delete across every layer. Then layer on a FIRST-OF-ITS-KIND reusable color "palette" badge primitive. The master move is mechanical: clone job-types, rename `JobType`→`EntityType` / `name`→`type` / `JT-`→`ET-`, drop ALL relation/stats code, and add the palette. "Done" = the entity-types vertical exists end-to-end, both server-side search bars work, the color badge renders, and `/check` is green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ Palette representation: Prisma enum `FlooringEntityTypeColor` (type-safe, mirrors `FlooringPaymentDirection`) vs a `VarChar` string constrained only in the domain vs a lookup table. (Task says enum/value-object stored ON the row → rules out a lookup table.)
- ⚑ The concrete color set + count (e.g. 6/8/12), and the exact names / hex / Tailwind classes — must be defined in BOTH the domain value object and the UI class map.
- ⚑ Color rendering (DECIDED — option 1): the color renders as a chip bound to the `type` cell by REUSING the existing `CellChip` (`engines/common/badges/cell-chip.tsx`, the adjustments/payments ledger chip), extended additively with a non-semantic `paletteColor` prop — NOT a new badge, NOT in the row-action rail, NOT added to the semantic `BadgeTone`. Keep `CellChip` column-agnostic (here it wraps `type`; the same pattern may wrap `ET-#`/row# when reused later). Remaining open: confirm the additive `CellChip` extension shape vs a thin palette-wrapper component over it.
- ⚑ `type` uniqueness: `@unique` on `type` (like job-types `name @unique`, with `isP2002`→409) vs allow duplicates. This decides whether create/update keep the P2002 branch.
- ⚑ Exact strings: model `FlooringEntityType` / `@@map flooring_entity_type` / sequence `flooring_entity_type_number_seq` / prefix `ET-` — confirm all four.
- ⚑ Palette picker UI: `SelectDropdown` (color-swatch dropdown, picker engine) vs `SegmentedChoiceCell` (inline swatches, record-view engine).
- ⚑ Domain palette value-object location: module-local `packages/domain/src/management/entity-types/palette.ts` vs `packages/domain/src/shared/` (if cross-module reuse is wanted from day one).
- ⚑ List default sort: `type` asc vs `entityTypeNumberInt` asc vs `createdAt` desc (job-types sorts `name` asc).
- ⚑ Update path shape: section route `[id]/primary/section` (mirrors job-types `mutations.ts:15-28`) vs a simpler `PATCH /[id]`.
- ⚑ Optimistic concurrency: carry the same `assertExpectedUpdatedAt` / `expectedUpdatedAt` revision gate on update + delete (job-types `[id]/route.ts:62-68`) — part of the canonical gauntlet.
- ⚑ Record-view stepper: ship prev/next via `numberNeighborQueries` (`read-repository.ts:132-151`) or omit (less read code).
- ⚑ Auth gate: job-types pages use `requireSessionUser()` (`page.tsx:16`), not `requireToolAccess` — match the mirror unless a tool gate is intended.
- ⚑ `type` column name: confirm the literal `type` (TS/SQL-adjacent, user-facing copy) vs `label`/`name`.
- ⚑ GAP / design risk: the palette MUST be a SEPARATE non-semantic color map — do NOT reuse `CellTone` (success/warning/error…), or the "plain colors, no meaning" requirement leaks into the semantic system (`badge-tone.ts:5`, `segmented-choice-cell.tsx:17-24`).
- ⚑ GAP: `dbgenerated` quoting — an `@map`'d snake column → unquoted `SUBSTRING(entity_type_number FROM 4)`; confirm the offset. Prisma can't emit `GENERATED ALWAYS STORED`, so the hand-written migration is authoritative for `entityTypeNumberInt`.

## Scope
In: A complete brand-new `Entity Types` CRUD vertical cloned from `management/job-types`, end-to-end across Schema → Migration → Domain → Data → Application → API → Module dir → Pages; two server-side search bars (free-text on `type` + exact `ET-#`); `createdBy`/`updatedBy` actor columns; and a first-of-its-kind reusable non-semantic color "palette" badge primitive.

Out:
- Add NO relation/FK into any existing model — linking entity-types to anything is a later step.
- Do NOT modify the existing job-types module or any other existing module/page.
- Do NOT touch any EXISTING line in the four shared-append-only files (see below) — append-only.
- Do NOT register a nav entry — `apps/web/hooks/navigation/routes.ts`, the record-create-menu, and `dashboard/page.tsx` are OFF-LIMITS. The page is reachable by direct route; nav wiring is a later step.
- Do NOT reuse the semantic `CellTone` vocabulary for the palette.

### ⚠ CRITICAL WIRING CONSTRAINT — SHARED-APPEND-ONLY FILES
Four files are shared with concurrent work and must be edited STRICTLY APPEND-ONLY. Add ONLY your brand-new lines; NEVER edit, reorder, move, or touch any pre-existing line in them. Adding your own new line is REQUIRED and safe; touching an existing line is forbidden.
1. `packages/db/prisma/schema.prisma` — APPEND a new `FlooringEntityType` model block at a NEW region (and, if palette = enum, a new `enum FlooringEntityTypeColor {…}` block near the other enums at L66-90). Add NO relation/FK into any existing model.
2. `packages/domain/src/index.ts` — APPEND one new line: `export * from "./management/entity-types/index.js"`.
3. `packages/db/src/index.ts` — APPEND the analogous new export line.
4. `packages/application/src/index.ts` — APPEND the analogous new export line.
These three barrel export lines are what let the API route resolve its `@builders/application` (and domain/db) imports, so the vertical builds and `/check` passes. Everything else you own is a brand-new file.

## Files you own (do not edit anything outside this list)

### Shared (APPEND-ONLY — add new lines only, never touch existing lines)
- `packages/db/prisma/schema.prisma` — append `FlooringEntityType` model (+ optional `FlooringEntityTypeColor` enum near L66-90)
- `packages/domain/src/index.ts` — append `export * from "./management/entity-types/index.js"`
- `packages/db/src/index.ts` — append the analogous export line
- `packages/application/src/index.ts` — append the analogous export line

### Schema
(shared-append-only, see above)

### Migration (all NEW)
- `packages/db/prisma/migrations/<timestamp>_create_flooring_entity_type/migration.sql`

### Domain (all NEW)
- `packages/domain/src/management/entity-types/types.ts`
- `packages/domain/src/management/entity-types/form-rules.ts`
- `packages/domain/src/management/entity-types/normalizers.ts`
- `packages/domain/src/management/entity-types/list-config.ts`
- `packages/domain/src/management/entity-types/error-messages.ts`
- `packages/domain/src/management/entity-types/palette.ts`  (NEW — palette value object)
- `packages/domain/src/management/entity-types/index.ts`  (local barrel, in-envelope)

### Data (all NEW)
- `packages/db/src/management/entity-types/read-repository.ts`
- `packages/db/src/management/entity-types/write-repository.ts`
- `packages/db/src/management/entity-types/index.ts`  (local barrel, in-envelope)
- (read-only reuse, do not edit) `packages/db/src/shared/number-neighbors.ts` — import only if you ship the stepper

### Application (all NEW — one file per use case; use cases do NOT import use cases)
- `packages/application/src/management/entity-types/create-entity-type.ts`
- `packages/application/src/management/entity-types/update-entity-type.ts`
- `packages/application/src/management/entity-types/list-entity-types.ts`
- `packages/application/src/management/entity-types/delete-entity-type.ts`
- `packages/application/src/management/entity-types/errors.ts`
- `packages/application/src/management/entity-types/types.ts`
- `packages/application/src/management/entity-types/index.ts`  (local barrel, in-envelope)

### API (all NEW)
- `apps/web/app/api/entity-types/route.ts`
- `apps/web/app/api/entity-types/_validators.ts`
- `apps/web/app/api/entity-types/[id]/route.ts`
- `apps/web/app/api/entity-types/[id]/primary/section/route.ts`

### Module dir (all NEW — mirror modules/job-types/ ~21 files)
- `apps/web/modules/entity-types/data/list-entity-types-request.ts`
- `apps/web/modules/entity-types/data/queries.ts`
- `apps/web/modules/entity-types/data/mutations.ts`
- `apps/web/modules/entity-types/controllers/list/use-entity-types-list-controller.ts`
- `apps/web/modules/entity-types/components/list/entity-types-client.tsx`
- `apps/web/modules/entity-types/components/list/toolbar-controls/entity-types-list-search.tsx`
- `apps/web/modules/entity-types/components/list/table/entity-types-list-columns.ts`
- `apps/web/modules/entity-types/components/list/table/entity-types-row-cell.tsx`
- `apps/web/modules/entity-types/components/record/entity-type-detail-client.tsx`
- `apps/web/modules/entity-types/components/record/entity-type-create-client.tsx`
- `apps/web/modules/entity-types/components/record/record-panel.tsx`
- `apps/web/modules/entity-types/components/record/primary/entity-type-primary-fields-section.tsx`
- (+ remaining mirror files from `modules/job-types/` — match its file set head-to-toe)

### Pages (all NEW)
- `apps/web/app/dashboard/entity-types/page.tsx`
- `apps/web/app/dashboard/entity-types/new/page.tsx`
- `apps/web/app/dashboard/entity-types/[id]/page.tsx`

### Palette / color-chip primitive — REUSE existing `CellChip`, do NOT clone
- `apps/web/engines/common/badges/cell-chip.tsx` — EXISTING primitive (the square-cornered, bordered, tinted value-chip used on the adjustments + payments ledgers). EXTEND it additively (see layer map); do NOT touch its existing `tone` path.
- `apps/web/engines/common/badges/contracts/color-palette.ts` — NEW: the non-semantic palette color→className map.
- `apps/web/engines/common/badges/index.ts` — existing local barrel (in-envelope); export the new palette pieces.

## Layer-by-layer map

### Schema (APPEND-ONLY)
`packages/db/prisma/schema.prisma` — append a new `FlooringEntityType` model mirroring `FlooringJobType` (schema.prisma:410-426):
- `id` uuid
- `entityTypeNumber String @unique @default(dbgenerated("('ET-'::text || (nextval('flooring_entity_type_number_seq'::regclass))::text)")) @map("entity_type_number")` — mirror `:412` / `:224`
- `entityTypeNumberInt Int? @default(dbgenerated("(SUBSTRING(entity_type_number FROM 4))::integer"))` — mirror `:413`; `ET-` is 3 chars → `FROM 4`
- `type String @db.VarChar(30)` — VarChar syntax mirror `FlooringInventory.note` (`:241`)
- a palette color column (enum vs string — see ⚑ flag)
- `createdAt` / `updatedAt` / `createdBy String?` / `updatedBy String?` — mirror `:415-418`
- `@@index([entityTypeNumber])`, `@@index([entityTypeNumberInt])` — mirror `:423-424`
- trgm GIN on `type`: `@@index([type(ops: raw("gin_trgm_ops"))], type: Gin, map: "flooring_entity_type_type_trgm_idx")` — mirror `:266`
- `@@map("flooring_entity_type")`
- If palette = enum, append a new `enum FlooringEntityTypeColor {…}` block near L66-90.

### Migration (NEW)
`packages/db/prisma/migrations/<timestamp>_create_flooring_entity_type/migration.sql` — mirror `20260621120000_create_flooring_payment/migration.sql:1-43` (table + sequence + enum) and `20260622160000_job_type_number/migration.sql:11-19`:
- `CREATE SEQUENCE flooring_entity_type_number_seq;`
- (if enum) `CREATE TYPE "FlooringEntityTypeColor" AS ENUM(…);`
- `CREATE TABLE "flooring_entity_type"` with `entity_type_number TEXT NOT NULL DEFAULT ('ET-'::text || nextval(…))`
- `entityTypeNumberInt INTEGER GENERATED ALWAYS AS (CAST(SUBSTRING("entity_type_number" FROM 4) AS INTEGER)) STORED` — mirror `20260622160100_job_type_number_int_generated_column/migration.sql:8-10`
- unique + btree indexes
- `CREATE INDEX "flooring_entity_type_type_trgm_idx" … USING GIN ("type" gin_trgm_ops)` — mirror `20260623130000_product_attribute_search_indexes/migration.sql:4`
- NO `CREATE EXTENSION` — `pg_trgm` is already enabled (`20260521044911_enable_pg_trgm`)
- `type` column is `VARCHAR(30)`
- The user runs `db:deploy`.

### Domain (NEW dir `packages/domain/src/management/entity-types/`)
- `types.ts` — mirror `job-types/types.ts:1-35`: `EntityType`, `EntityTypeListRow`, `EntityTypeForm`, `EMPTY_ENTITY_TYPE_FORM`, `toEntityTypeForm`, plus a `color` field; DROP Stats/Option.
- `form-rules.ts` — mirror `:1-6`: `validateEntityTypeForm` + length ≤30 + color-required.
- `normalizers.ts` — mirror `:1-27`: `normalizeEntityType`.
- `list-config.ts` — `LIST_ENTITY_TYPES_PAGE_SIZE` / `_MAX_PAGE_SIZE`.
- `error-messages.ts` — `*_REQUIRED_MESSAGE` / `*_CONFLICT_MESSAGE`.
- `palette.ts` (NEW) — canonical color set + `EntityTypeColor` union/const-array + `isEntityTypeColor` predicate; pure data, no I/O.
- `index.ts` — local barrel (in-envelope).

### Data (NEW dir `packages/db/src/management/entity-types/`)
- `read-repository.ts` — mirror `job-types/read-repository.ts`. Exact-int `ET-#` search at `:54-66` (strip `\D`, parse, `entityTypeNumberInt: { equals: parsed ?? -1 }`); + `type contains` insensitive like `:55`. `listEntityTypesForListView`, `getEntityTypeById`, `getEntityTypeDetailById`. DROP `getJobTypeStats` / `_count`.
- `write-repository.ts` — mirror `:1-52`: `create` / `update` / `deleteEntityTypeRecord` with `createdBy`/`updatedBy` threaded; add `type` / `color`.
- `index.ts` — local barrel (in-envelope).
- Reuse shared `packages/db/src/shared/number-neighbors.ts` (read-only import) ONLY if you ship the stepper.

### Application (NEW dir `packages/application/src/management/entity-types/`)
- `create-entity-type.ts` — mirror `create-job-type.ts:10-48`: `actorEmail` guard, `withDatabaseTransaction`, `isP2002` → 409.
- `update-entity-type.ts` — mirror `update-job-type.ts:11-54`: `P2025` → 404.
- `list-entity-types.ts` — mirror `list-job-types.ts:14-35` using `../../list-view/contracts.js` `ListInput`/`Output`; `EntityTypesListFilters` with `entityTypeNumber`.
- `delete-entity-type.ts`.
- `errors.ts` — `EntityTypeExecutionError` + code union.
- `types.ts` — mirror `job-types/types.ts:1-9`: the `Omit<…, "createdBy" | "updatedBy">` actor-strip.
- `index.ts` — local barrel (in-envelope).

### API (NEW dir `apps/web/app/api/entity-types/`)
- `route.ts` — mirror `api/job-types/route.ts:1-83`: GET `applyRoutePolicy` → `enforceQueryRateLimit` → validator → `listEntityTypesUseCase` → `routeJson`; POST `applyRoutePolicy` CRUD_CREATE `scope: "entityTypes.create"` → `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry(createEntityTypeUseCase(input, access.user.email))` → `finalizeMutationReceipt`.
- `_validators.ts` — mirror `:1-89`: `validateCreateEntityTypeInput` / `validateUpdateEntityTypeInput`, `listEntityTypesQuerySchema` with `q` / `entityTypeNumber` / `page` / `pageSize`; add color validation against the domain palette.
- `[id]/route.ts` — mirror `:1-103`: GET detail + DELETE with `assertExpectedUpdatedAt` optimistic concurrency.
- `[id]/primary/section/route.ts` — PATCH update path (`mutations.ts:15-28` PATCHes `/api/{id}/primary/section`); mirror the job-types equivalent.

### Module dir (NEW dir `apps/web/modules/entity-types/`, mirror `modules/job-types/` ~21 files)
- `data/list-entity-types-request.ts` — mirror `list-job-types-request.ts:1-59`: parser, `buildEntityTypesListSearchString`, `listEntityTypesRequest`, `ENTITY_TYPES_LIST_QUERY_KEY`.
- `data/queries.ts` — mirror `:1-49`, DROP stats.
- `data/mutations.ts` — mirror `:1-36`.
- `controllers/list/use-entity-types-list-controller.ts` — mirror `:1-19`.
- `components/list/entity-types-client.tsx` — mirror `job-types-client.tsx:1-189`. TWO SEARCH BARS here: `<EntityTypesListSearch>` free-text on `type` (`:144-147`) + `<DebouncedSearchControl placeholder="ET #">` exact `ET-#` (`:148-153`), plus the `string[]` ↔ scalar filter adapters (`:30-43`).
- `components/list/toolbar-controls/entity-types-list-search.tsx` — mirror `job-types-list-search.tsx:1-18`, `SearchControl` from `@/engines/list-view`.
- `components/list/table/entity-types-list-columns.ts` + `entity-types-row-cell.tsx` — mirror `:1-13` / `:1-29`. The color renders via the REUSED `CellChip`: replace the `type` cell's plain `<span>` with `<CellChip paletteColor={row.color}>{row.type}</CellChip>` (option 1 — chip bound to the `type` cell, same primitive as the adjustments/payments ledgers). Keep it column-agnostic.
- `components/record/entity-type-detail-client.tsx` + `entity-type-create-client.tsx` + `record-panel.tsx` — mirror `job-type-create-client.tsx:1-64`.
- `components/record/primary/entity-type-primary-fields-section.tsx` — mirror `job-type-primary-fields-section.tsx:1-79`: replace the `name` `TextCell` (`:42-52`) with a `type` `TextCell` + the palette picker feeding `color`.

### Pages (NEW dir `apps/web/app/dashboard/entity-types/`)
- `page.tsx` — mirror `dashboard/job-types/page.tsx:1-48`: auth → parse → prefetch `listEntityTypesUseCase` → `HydrationBoundary`; job-types uses `requireSessionUser()` (`:16`) — match the mirror.
- `new/page.tsx` — mirror `:1-19`.
- `[id]/page.tsx` — mirror `:1-47`, the `PrismaDetailPageResult` branch.

### Palette / color-chip primitive — REUSE `CellChip`, do NOT build a new badge
The chip already exists: `apps/web/engines/common/badges/cell-chip.tsx` — the square-cornered, bordered, tinted value-chip on the adjustments + payments ledgers (`adjustments-row-cell.tsx`, `payments-row-cell.tsx`). Today it is driven by the SEMANTIC `BadgeTone` set (`TONE_CLASS_NAME`: default/success/warning/error/processing/muted). Your palette is NON-semantic (user-assigned, meaningless in code), so DO NOT add palette colors to `BadgeTone` and DO NOT clone `StatusBadge`. Instead:
- **Extend `cell-chip.tsx` additively** — add an optional `paletteColor?: EntityTypeColor` prop. When present it overrides the tone path and pulls its className from the new palette map; when absent, the existing `tone` behavior is byte-for-byte unchanged (the ledgers keep working). This is the one EXISTING shared file you edit, and it's purely additive/backward-compatible.
- `contracts/color-palette.ts` (NEW) — the non-semantic palette color→Tailwind-class map (the data-driven sibling of `contracts/badge-tone.ts:1-6`). Keyed by the palette value, NOT by any semantic tone.
- `index.ts` — export the new palette map (+ the `EntityTypeColor` type re-export if helpful) from the existing in-envelope local barrel.
NOTE: domain `palette.ts` = the value set (validation/persistence); this UI contract = the class mapping (presentation). The chip is COLUMN-AGNOSTIC: here the color drives the `type` cell, but the same `CellChip` + `paletteColor` is meant to wrap a different cell (e.g. the `ET-#`/row number) when this pattern is reused later — keep the primitive generic, not `type`-specific.

## Migration
Write the migration; DO NOT run it. The user runs all migrations.

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
