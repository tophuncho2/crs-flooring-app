---
name: column-new-index
description: Master of making an EXISTING column searchable — the follow-on to /column-new-string. Adds the database index + the list-view search bar + the server-side filter for one already-shipped column, end-to-end across the schema-index → migration → data-filter-map → application-filters → request-allowlist → api-validator → list-search-UI → tests stack. Invoke after a column ships "searchable-later" (e.g. work-orders.purchaseOrderNumber) to wire substring search now. Classifies the search shape first — trgm GIN (substring ILIKE, the default for free-text/codes) vs btree (exact/equality) vs exact-int (a generated number column) — because the index and the where-clause differ. The filter plumbing is data-driven: add the key to four allowlists + one ILIKE clause + one search control and it wires itself. Editing skill, not read-only. Explicit-only — invoke on /column-new-index.
---

# /column-new-index

`/column-new-index` makes you the owner of **making an existing column searchable**. The user invokes it with a free-form intent — "add a search bar for `purchaseOrderNumber`", "let me filter work orders by PO #", "index the `reference` code so the list can search it". The column already exists across the layers (that was `/column-new-string` or a sibling); your job is the **search slice**: the index, the migration, the server-side `where` filter, the four data-driven allowlists, and the list-view search control — then prove it filters server-side.

This is an **editing** skill — it traces an existing analogous *searchable* field across the search layers, classifies the new field's search shape, then makes the change across the stack. It is not a read-only audit (`/quick-report`/`/dig`) and not a whole-module plan (`/newsession`, which this skill's deep-dig step borrows from).

## Scope — exactly one kind of wiring

This skill owns **making one existing column searchable** and nothing else:

- **The column already exists.** Every non-search layer (schema field, domain type, data select, validator presence, list/record/CSV display) is already shipped. If the column itself does not exist, add it first with **/column-new-string** (string) or the sibling **/column-new-*** skill, then return here.
- **Search + index only.** The `@@index`, the migration, the `where`/ILIKE clause, the filter allowlists, and the list search bar. Nothing about display, persistence, or the save path.
- **Not sort.** A sort-by-column (the menu Sort tool + its `(col, id)` btree) is **/column-sort**. Search ≠ sort; they have different indexes and different UI.
- **Not the generated record number.** The exact-int `*NumberInt` search + stepper is **/column-rownumber** (it owns the special-case exact-int path; this skill defers to it).

## The model (what making a column searchable IS)

A new search filter is **one slice repeated across the search layers**, walking the spine:

`schema index (+ migration) → data FilterMap + buildWhere clause → application Filters type → request FILTERABLE_FIELDS → api TEXT_FILTER_KEYS → list-view search control → tests`

The single best technique: **pick an existing searchable field of the same shape and trace it through every layer first.** On work-orders, `unitType` / `unitNumber` / `description` are the canonical **trgm-ILIKE** analogs (the trace this skill was built from — `purchaseOrderNumber` mirrored them edit-for-edit); `workOrderNumber` is the **exact-int** outlier (its `workOrderNumberInt` parseInt path belongs to `/column-rownumber`, do not copy it for a string). Match the analog's shape exactly.

### Classify the search shape before touching (this decides the index + the where-clause)

Decide this in Step 1 — it gates the index type and the `buildWhere` clause:

1. **trgm GIN (substring ILIKE)** — **the default** for free-text and codes (PO #, reference, description, unit type). Index: `@@index([<field>(ops: raw("gin_trgm_ops"))], type: Gin, map: "<table>_<field>_trgm_idx")`. Where-clause: `{ <field>: { contains: value, mode: "insensitive" } }`. Requires the `pg_trgm` extension (already enabled repo-wide via `20260521044911_enable_pg_trgm`). This is the `purchaseOrderNumber` case.
2. **btree (exact / equality / prefix)** — a low-cardinality code matched exactly, or a column also used for range/sort. Index: plain `@@index([<field>])`. Where-clause: `{ <field>: { equals: value } }` (or a range). Reach for this only when substring search is genuinely wrong.
3. **exact-int (generated record #)** — the `*NumberInt` "land the one row" path (strip non-digits → parseInt → `{ equals }`, sentinel `-1` for non-numeric). This is **out of scope** → **/column-rownumber**. Never bolt the parseInt special-case onto a plain string column; a PO # like "PO-48" is substring (#1), not numeric.

Default to **trgm GIN + ILIKE** unless the field is clearly equality/numeric. Btree is **not** needed for a searched-not-sorted field — only add a btree when the column is also sorted (and that btree is `/column-sort`'s job).

### Why the wiring is mostly free

The work-orders filter plumbing is **data-driven**: the request parser/URL-builder loop over `WORK_ORDERS_LIST_FILTERABLE_FIELDS`, and the API validator loops over `TEXT_FILTER_KEYS`. Adding the key to those allowlists wires parse + encode + validate automatically. You hand-write only **two** things: the `buildWhere` clause (the actual query) and the `DebouncedSearchControl` (the actual UI). Everything else is one-line allowlist entries.

## Hard rules

- **Column must already exist — or hand off.** This skill wires search onto a shipped column. If the field isn't in the schema/domain/data/display yet, that's **/column-new-string** (or a sibling) first.
- **Deep-dig before you touch.** Do the Step 1 read every time: trace one existing **searchable** field of the same shape across every search layer. The analog is the template; never write from this skill's spine alone. The code is the source of truth — memory and prior sessions drift.
- **Classify the search shape first.** trgm-ILIKE (default) vs btree vs exact-int. The shape decides the index AND the where-clause; guessing wrong ships a broken or absent filter.
- **Mirror trgm-ILIKE, not the exact-int special case.** For a free-text/code string the clause is `{ contains, mode: "insensitive" }` + a GIN-trgm index. Do **not** copy the `workOrderNumberInt` parseInt/`equals`/sentinel path — that's `/column-rownumber`'s.
- **The four allowlists must all agree.** The key goes in the db `FilterMap`, the application `Filters` type, the request `FILTERABLE_FIELDS`, and the api `TEXT_FILTER_KEYS`. A key missing from any one silently drops the filter on that boundary (parse, validate, or query) with no typecheck error.
- **Btree is for sort, not search.** A GIN-trgm index serves ILIKE; do not add a btree `(col, id)` for a searched-only column — that index belongs to `/column-sort`.
- **The user runs migrations — never the skill.** Author the SQL migration file alongside the schema edit (`CREATE INDEX "<table>_<field>_trgm_idx" ON "<table>" USING GIN ("<field>" gin_trgm_ops);`, double-quoted identifiers, a `<ts>` later than the newest existing migration) per `author-migration-with-schema-edit`; `db:deploy` only applies pre-written files. Never run it.
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed as built `dist/`. After editing the schema + db/application types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck`/tests, or healthy code shows phantom "not exported" errors.
- **Verify application is really pass-through — don't assume.** The list use case usually forwards `filters` verbatim, but read the use case + its `*ListFilters` alias to confirm the new key flows through before declaring "no change".
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; the schema/migration is its own commit.
- **Drive, don't multiple-choice.** Settle a genuine open question (trgm vs btree, placement of the search bar) by surfacing it in the response with a recommendation, then execute. Use a single question only when the answer changes the plan and you can't make a sound call.
- **Explicit-only.** Trigger on the literal `/column-new-index`. Not on "make it searchable", "add a filter", "can you index this".

## Step 1 — Deep-dig the target module

Before proposing anything, read the current reality (a focused `/newsession`-style read):

1. **Confirm scope.** The column already exists across the layers (schema field, domain type, data select). If not, hand off to **/column-new-string** / sibling first.
2. **Pick the analog.** Choose the closest existing **searchable** field of the same shape — free text/code → `unitType` / `description` (trgm-ILIKE); a generated number → defer to `/column-rownumber`. It is your edit-for-edit template.
3. **Trace the analog across every search layer** — schema `@@index` block + the migration that created it, data `WorkOrdersListFilterMap` + the clause in `buildWorkOrdersWhere`, application `WorkOrdersListFilters`, request `WORK_ORDERS_LIST_FILTERABLE_FIELDS` (+ the parser/URL-builder loops), api `TEXT_FILTER_KEYS` (+ the validation loop), and the list client's value read + `handleTextFilterChange` union + `hasActiveSearchTool` + the `DebouncedSearchControl` in the Search `ToolbarMenuButton`. Fan out with `Explore` agents when the module is large.
4. **Classify the search shape** (trgm-ILIKE / btree / exact-int) and confirm `pg_trgm` is enabled.
5. **Memory** — read `author-migration-with-schema-edit` (author the SQL file with the schema edit). Treat as context; verify against code.

State what you found in one tight block (target module, analog field, search shape, index name, `pg_trgm` present?) before proposing the change.

## Step 2 — Confirm the placement

Pin the exact insertion points from the analog trace:

- **Index** — which existing trgm index the new one sits beside in the `@@index` block; the `map:` name (`<table>_<field>_trgm_idx`).
- **Search bar** — which `DebouncedSearchControl` it sits after in the Search menu; its `placeholder` (short, e.g. "PO #") and `ariaLabel`.
- **Migration** — the `<ts>` (later than the newest existing migration) and dir name.
- Surface any genuinely ambiguous shape/placement call in the response with a recommendation; don't stall.

## Step 3 — Execute the layer walk

Touch every search layer (all are required — a missing one drops the filter at that boundary):

1. **Schema index + migration** — add the `@@index` to the model in `packages/db/prisma/schema.prisma` beside its trgm siblings (GIN-trgm for the default shape). Author `packages/db/prisma/migrations/<ts>_<module>_<field>_trigram_index/migration.sql` — `CREATE INDEX "<table>_<field>_trgm_idx" ON "<table>" USING GIN ("<field>" gin_trgm_ops);` with double-quoted identifiers, a `<ts>` later than the newest existing migration. **No backfill.** Never run it.
2. **Data** — `read-repository.ts`: add `<field>?: string[]` to `WorkOrdersListFilterMap` (in the identity-search group; update the group doc-comment), and add the clause in `buildWorkOrdersWhere` beside the analog: `const <field> = filters?.<field>?.[0]; if (<field>) andClauses.push({ <field>: { contains: <field>, mode: "insensitive" } })`.
3. **Application** — `list-*.ts`: add `<field>?: string[]` to `WorkOrdersListFilters`. **Read** the use case to confirm `filters` is forwarded verbatim (pass-through); if it allowlists/transforms filters, thread the new key.
4. **Request contract** — `data/list-<module>-request.ts`: add `"<field>"` to `WORK_ORDERS_LIST_FILTERABLE_FIELDS`. The parser + URL builder loop over the list → parse/encode are automatic.
5. **API** — `app/api/<module>/_validators.ts`: add `"<field>"` to `TEXT_FILTER_KEYS`. The validation loop consumes it automatically (one-element array, truthy-only).
6. **List-view search UI** — `components/list/<module>-client.tsx`: add `const <field>Value = filters.<field>?.[0] ?? ""`; widen the `handleTextFilterChange` key union with `"<field>"`; add `|| Boolean(<field>Value)` to `hasActiveSearchTool` (and its dep array); add a `<DebouncedSearchControl value={<field>Value} onCommit={(next) => handleTextFilterChange("<field>", next)} placeholder="…" ariaLabel="…" />` in the Search `ToolbarMenuButton`.
7. **Tests** — add a filter-parse test beside the existing request tests (`parse*ListInputFromSearchParams({ <field>: "…" })` → `filters.<field>` set; absent → undefined). If a where-builder test exists, assert the insensitive `contains` clause; if `buildWhere` is unexported and untested (the work-orders case), the parse test + the manual save-path reasoning suffice.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck` and tests. Don't typecheck before the dist rebuild.
- Run the full gauntlet (`/check`) for a cross-layer change, or at minimum the touched workspaces' tests + web typecheck.
- **Manually reason through the filter path** — does the typed value reach the URL, the parser, the validator, the `where`, and the index? Recommend the user smoke-test: type a substring in the Search menu → the list filters server-side.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; a table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema/migration is its own commit.

```
COLUMN-NEW-INDEX — <module>.<field> — <trgm-ILIKE | btree | exact-int>   (index: <name>)

═══ Grounding ═══
Target: <module>   Analog traced: <field>   Search shape: <trgm-ILIKE>   Index: <name>   pg_trgm: <enabled>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema index + migration | schema.prisma · migrations/<ts>_<module>_<field>_trigram_index | ✅ authored (unrun), GIN-trgm |
| Data | db/src/.../read-repository.ts | ✅ FilterMap key + ILIKE clause |
| Application | application/src/.../list-<module>.ts | ✅ Filters key, pass-through (verified) |
| Request | modules/<module>/data/list-<module>-request.ts | ✅ FILTERABLE_FIELDS (auto parse/encode) |
| API | app/api/<module>/_validators.ts | ✅ TEXT_FILTER_KEYS (auto validate) |
| Search UI | modules/<module>/components/list/<module>-client.tsx | ✅ value + handler union + active flag + control |
| Tests | request filter-parse (+ where-builder if testable) | ✅ |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
Filter path reasoned end-to-end (value reaches where + index): <yes>

═══ Open questions ═══
- <trgm vs btree / search-bar placement, or "none">

═══ Commit message ═══
<≤17 words; schema/migration in its own commit>
```

## What this skill does NOT do

- Skip the deep-dig and write from the spine alone — it traces a real searchable analog across the live code every run.
- Add the column itself — the schema field, domain type, data select, validator presence, and list/record/CSV display are **/column-new-string** (string) or the sibling **/column-new-*** skills. This skill assumes the column already ships.
- Bolt the exact-int parseInt/`equals`/sentinel search onto a plain string — that "land the one row" generated-number path is **/column-rownumber**.
- Add a btree `(col, id)` sort index or the menu Sort tool — multi-column **sort** wiring is **/column-sort**. A searched-only column needs only its GIN-trgm index.
- Add a `createdBy`/`updatedBy` actor pair → **/column-actor**; a `createdAt`/`updatedAt` pair or its display → **/column-timestamp**; a PaletteColor chip → **/column-color**.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Leave an allowlist out of sync — the key must land in all four (db FilterMap, app Filters, request FILTERABLE_FIELDS, api TEXT_FILTER_KEYS); a gap silently drops the filter with no typecheck error.
- Reshape engine / list-view / record-view chrome (the `DebouncedSearchControl`, `ToolbarMenuButton`, or the search-menu mechanism itself) — that's **/engine**.
- Plan or execute whole-module work or a broad multi-column sweep → **/newsession**; author another skill → **/newskill**.
- Commit, fold the schema/migration into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-new-index` invocation.
```
