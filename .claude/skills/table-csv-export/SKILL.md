---
name: table-csv-export
description: Master of the list-view **CSV export** across the domain-manifest → db-export-read → application-use-case → api-route+validator → client-query-builder+ListExportButton+useListSelection → tests stack — the shared `ExportColumn`/`toCsv`/`pickExportColumns` serializer, the `parseExportEnvelope` body parser, the `EXPORT` rate-limit bucket, the 5000-row ceiling, the selected-else-filtered scope, and the column-picker + row-selection UI. Invoke to install CSV export onto a list module, add/adjust an export column, audit an existing install for layer drift, or fold a per-module fork back onto the shared serializer. Knows the export REUSES the list read's `where`/`orderBy` verbatim so the file matches the on-screen scope, runs READ-ONLY on its own rate-limit bucket (no mutation gauntlet), and that each module's manifest mirrors ITS OWN visible list. Editing skill, not read-only. Explicit-only — invoke on /table-csv-export.
---

# /table-csv-export

`/table-csv-export` makes you the owner of the **list-view CSV export** — the shared `ExportColumn` manifest + `toCsv`/`pickExportColumns` serializer, the `parseExportEnvelope` POST-body parser, the `EXPORT` rate-limit bucket, the `resolveExportRowCap`/`EXPORT_MAX_ROWS` ceiling, the `normalizeIdFilter` ticked-rows scope, and the client `ListExportButton` + `useListSelection` UI. The user invokes it with a free-form intent — "add CSV export to adjustments", "audit the inventory export", "add a PO# column to the work-orders export", "fold that bespoke CSV writer onto the shared one". Your job: ground in the live three-module reference (inventory + work-orders + adjustments) and drive the export through every layer so the **file matches the on-screen list** and **no shared primitive gets forked**.

This is an **editing** skill — it reads, classifies, then wires the export across the stack. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`). Export is **proven on exactly three modules**; installing onto a fourth is the headline use.

## The model (what CSV export IS)

The export is **one shared serializer fed a per-module column manifest, scoped by the same list query the page uses, capped at a hard ceiling, and streamed as a CSV download.** A POST route (NOT the GET list route) carries the list query + ticked ids + picked columns + row cap; the use case reuses the list read's `where`/`orderBy` so the exported set is exactly the filtered, sorted list. Wiring an export needs **no schema change** — it reads only fields/relations that already exist. (Adding an `id?` to the module's list-filters TYPE for the ticked-rows scope is a domain *type* change, not a schema change.)

**Export is READ-ONLY and lives on its OWN rate-limit bucket.** No mutation gauntlet (`parseMutationEnvelope`/`enforceMutationReceipt`/telemetry) — just `applyRoutePolicy` with the `EXPORT` preset under a per-module `scope` (`inventory.export`, `work-orders.export`, `adjustments.export`) so a bulk pull never drains the shared list-browse allowance.

**Scope = selected-else-filtered.** When the user ticks rows, those ids merge into `filters.id` (an `IN` clause in the SHARED where builder, ANDed with the live filters); when nothing is ticked, the whole filtered set exports. The hard ceiling is **5000** — `resolveExportRowCap` clamps the requested cap, and `parseExportEnvelope` independently caps the `ids` array. The route returns `x-export-total`/`x-export-count` headers so the client can flag "first N of M" truncation.

```
domain manifest ({M}_EXPORT_COLUMNS) → db export read (export{M}ForListView, reuses list where+orderBy) → application use case (export{M}UseCase: cap + filters + ids merge) → api POST route + _validators (parseExportEnvelope + reuse list validator) → client (build{M}ExportQuery + ListExportButton + useListSelection; table selection prop) → tests (domain manifest + app use case + web query-builder)
```

### The shared machinery (never fork it — `consolidate-shared-not-per-module`)

- **Serializer** — `packages/domain/src/shared/csv.ts`: `ExportColumn<TRow> = { key; label; value: (row) => string }`, `toCsv(rows, columns, { bom })` (RFC-4180, CRLF, optional UTF-8 BOM), `pickExportColumns(columns, keys)` (whitelist + preserve manifest order), `EXPORT_MAX_ROWS = 5000`, `resolveExportRowCap(cap)` (clamps `number`/`"all"`/absent to ≤ 5000). All re-exported through `@builders/domain`.
- **Ticked-id normalizer** — `packages/domain/src/shared/id-filter.ts`: `normalizeIdFilter(ids)` (trim, dedupe, drop-empty, `undefined` when none).
- **Envelope parser** — `apps/web/server/http/export-request.ts`: `parseExportEnvelope(body, allowedColumnKeys)` → `{ query, ids?, columns?, cap? }`. Lenient (bad columns/cap/ids dropped, not 400'd); only the embedded `query` raises the module's validation error downstream. `ids` trimmed/deduped/capped at `EXPORT_MAX_ROWS`; `columns` whitelisted against the manifest keys.
- **CSV response** — `apps/web/server/http/route-helpers.ts`: `routeCsv(ctx, csv, { filename, extraHeaders })` (`text/csv; charset=utf-8` + `content-disposition` attachment + `x-request-id`). Errors still go through `routeError` (JSON).
- **Rate-limit preset** — `apps/web/server/http/rate-limit-presets.ts`: `EXPORT = { limit: 60, windowMs: TEN_MINUTES_MS }`.
- **Selection hook** — `@/engines/list-view` `useListSelection()` → `ListSelection { selectedIds; selectedCount; isSelected; toggle; toggleAll; clear }`. Stateless about rows (consumer passes `pageEligibleIds` to `toggleAll`); selection persists across pages; **clear it when the scope changes**.
- **Export UI** — `@/engines/list-view` `ListExportButton`: the whole menu (its OWN `ToolbarMenuButton` trigger + "Select specific rows" toggle + column picker + row-cap dropdown + Download button + fetch/blob/anchor download + truncation message from the `x-export-*` headers). Rendered **directly** in `ListActionBar` — never wrap it in another `ToolbarMenuButton`.
- **Table seam** — `@/engines/list-view` `DataTable` optional `selection={{ selectedIds, onToggleRow }}` prop prepends the checkbox column.

### The canonical per-layer wiring (reference: inventory + work-orders + adjustments)

| Layer | File(s) | The export seam |
|---|---|---|
| Domain manifest (the ONE column source) | `packages/domain/src/flooring/{m}/export-columns.ts` (+ barrel) | `{M}_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<{Row}>>`; each `{ key, label, value: (row) => string }` is a **pure** projection mirroring the list cell. Re-export through the module `index.ts`. |
| Filters type | `packages/domain/src/flooring/{m}/types.ts` | add optional `id?: ReadonlyArray<string>` to the list-filters type — the ticked-rows scope (never parsed from the URL; the use case merges it). |
| DB export read | `packages/db/src/flooring/{m}/read-repository.ts` (+ barrel via `export *`) | `export{M}ForListView({ filters, sort?, take })` — unpaginated `count` + `findMany({ take })` via `Promise.all`, reusing the SHARED `build{M}ListViewWhere` (which must handle `filters.id` → `{ id: { in } }`) + `build{M}ListViewOrderBy`. If the list read built its `where` inline, **extract it into the shared helper first** (no behavior change), then add the `id IN` clause. |
| Application use case (one file, no cross-import) | `packages/application/src/flooring/{m}/export-{m}.ts` (+ barrel) | `export{M}UseCase(input)`: `take = resolveExportRowCap(input.cap)`; resolve filters + sort the SAME way the list use case does; merge `const ids = normalizeIdFilter(input.ids); if (ids) filters.id = ids`; call the db read; return `{ rows, total }`. |
| API route (POST, read-only) | `apps/web/app/api/{m}/export/route.ts` | `applyRoutePolicy(req, { rateLimit: { ...EXPORT, scope: "{m}.export", route: "/api/{m}/export" } })` → `validate{M}ExportRequest(body)` → `export{M}UseCase` → `toCsv(rows, pickExportColumns({M}_EXPORT_COLUMNS, columns), { bom: true })` → `routeCsv(access, csv, { filename: "{m}-export.csv", extraHeaders: { "x-export-total", "x-export-count" } })`. No mutation gauntlet. |
| API validator | `apps/web/app/api/{m}/_validators.ts` | `{M}_EXPORT_COLUMN_KEYS = new Set({M}_EXPORT_COLUMNS.map(c => c.key))` + `validate{M}ExportRequest(body)` = `parseExportEnvelope(body, keys)` then **reuse the list query validator** on `new URLSearchParams(envelope.query)`, layering `ids`/`columns`/`cap`. |
| Client query builder | `apps/web/modules/{m}/data/list-{m}-request.ts` | `export` the list encoder `build{M}ListSearchString` (un-privatize it) + add `build{M}ExportQuery(input)` = that string with `page`/`pageSize` deleted. |
| Client wiring | `apps/web/modules/{m}/components/list/{m}-client.tsx` | `useListSelection()`; `selectionEnabled` state + toggle (clear on off); `scopeSignature = JSON.stringify({ filters, sorts })` effect → `selection.clear()`; `selectedIds`/`pageEligibleIds`/`exportQuery`/`exportColumns`; render `<ListExportButton …/>` in `ListActionBar`; pass `selection={selectionEnabled ? selection : undefined}` to the table. |
| Table | `apps/web/modules/{m}/components/list/{m}-table.tsx` | accept `selection?: ListSelection` and forward `selection={selection ? { selectedIds, onToggleRow: selection.toggle } : undefined}` to `DataTable`. |
| Tests | `packages/domain/tests/…/export-columns.test.ts` · `packages/application/tests/…/export-{m}.test.ts` · `apps/web/tests/modules/{m}/list-{m}-request.test.ts` | manifest spec (key labels/values, intentional exclusions); use-case spec (cap clamp, ids merge/dedup, total passthrough — mock `@builders/db`); query-builder spec (strips page/pageSize, keeps sorts + filters). |

### Manifest value shapes (copy the list cell, machine-friendly)

- **Reuse the SAME pure domain formatters the row-cell uses** (`formatSignedAdjustmentQuantity`, `formatAdjustmentTransition`, `composeRollNumberDisplay`, `formatMoney`, …) so a cell and its CSV value never diverge. Domain manifests may import only **pure** domain helpers — never `apps/` code.
- **Live relations, not raw columns** — project the server-resolved label the list shows (`row.productName` from the `product.name` join), not a dropped snapshot column.
- **Timestamps** render Eastern wall-clock via `formatEasternDateTime` (the canonical export convention; the module's UI timestamp wrapper just delegates to it).
- **Nullable cols → `""`** (machine-friendly), not the list's `"-"`/`"—"` placeholder.
- **Enums/booleans → friendly words** (`"Increase"`/`"Deduction"`, `"Waste"`/`""`), mirroring the cell.

### Done vs candidate (verify against live code each run)

- **Done (3):** inventory + work-orders + adjustments. These are the references, not a roadmap.
- **Candidate:** any toolbar list module with a `data/list-{m}-request.ts` encoder + the shared `ListActionBar` toolbar — properties, templates, entities, job-types, payments, warehouses, products. Confirm the module renders `ListActionBar` and has a list-search encoder to reuse before promising export.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — the three references + the shared machinery + the target. Export is **read-only**: the route uses `applyRoutePolicy` + the `EXPORT` preset only, **never** the mutation gauntlet.
- **Never fork the shared serializer/parser/hook.** `toCsv`/`pickExportColumns`/`ExportColumn`/`EXPORT_MAX_ROWS`/`resolveExportRowCap`/`normalizeIdFilter` (`@builders/domain`), `parseExportEnvelope`/`routeCsv`/`EXPORT` (`apps/web/server/http`), `useListSelection`/`ListExportButton` (`@/engines/list-view`) are the ONE implementation. A bespoke CSV writer, envelope parser, or selection hook is a **consolidate** job, not a second copy.
- **The export REUSES the list read's `where`+`orderBy` verbatim.** The exported set must equal the on-screen filtered/sorted list. If the list `where` is inline in the list read, **extract it into a shared `build{M}ListViewWhere` helper** (no behavior change) so both reads share it — then add the `filters.id` → `{ id: { in } }` clause for the ticked-rows scope.
- **Selected-else-filtered, capped at 5000.** Ticked `ids` → `filters.id` via `normalizeIdFilter` (deduped/trimmed), ANDed with the live filters; absent → full filtered set. `resolveExportRowCap` clamps the cap and `parseExportEnvelope` caps the `ids` array — both at `EXPORT_MAX_ROWS`. Return `total` (pre-cap) so the route emits `x-export-total`/`x-export-count`.
- **The manifest is the ONE column source, and its values are PURE and mirror the list cell.** Reuse the row-cell's domain formatters; project server-resolved labels (live relations), not raw/snapshot columns; Eastern timestamps via `formatEasternDateTime`; nullable → `""`. The same manifest feeds the client column-picker (`{ key, label }`) and the server serializer (`value`).
- **Each module's manifest mirrors ITS OWN visible list — per-module divergence is expected.** Adjustments keeps actor + transition columns; inventory's leaner manifest doesn't. A product call (exclude UI-hidden columns like cost/freight, include/skip actor columns) is a **real question to surface**, never an invented column.
- **`{bom: true}` always** — Excel needs the UTF-8 BOM to decode accented/unicode cells.
- **`ListExportButton` renders DIRECTLY in `ListActionBar`** — it carries its own trigger; do not wrap it in a `ToolbarMenuButton`. Pass `selection` to the table **only** when `selectionEnabled`; clear ticks on toggle-off and on `scopeSignature` change.
- **POST route, separate `scope`, colocated validator.** The export is `/api/{m}/export/route.ts` (POST), distinct from the GET list route; its rate-limit `scope` is `{m}.export`; `validate{M}ExportRequest` lives in the module `_validators.ts` and **reuses the list query validator** on the embedded `query` (one source for the filter/sort contract).
- **Build db before typecheck; re-run the FULL suite.** The export read is consumed via dist by the use case — build `@builders/db` before `typecheck` (the dist trap). Web tests resolve `@builders/db` to **dist**; keep cross-package mocks in the application tests, not web. Run the whole suite, not just the new specs.
- **No schema change to wire an export.** It reads existing fields/relations only. Adding `id?` to the filters TYPE is a domain type change (allowed). A missing field the user wants to export is a `/session-new` job — surface it, don't add a column.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words. Export is schema-free (read-only over existing data) — a single non-schema commit; no migration to run.
- **Drive, don't multiple-choice.** Surface genuine product/divergence questions (which columns; exclude UI-hidden ones; include actor columns) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/table-csv-export`. Not on "export this", "download a CSV", "add a download button".

## Step 1 — Ground in the live export reality

Before classifying, read the current reality:

1. **Shared machinery** — confirm `packages/domain/src/shared/csv.ts` (+ `id-filter.ts`), `apps/web/server/http/export-request.ts` + `route-helpers.ts` (`routeCsv`) + `rate-limit-presets.ts` (`EXPORT`), and `@/engines/list-view` (`useListSelection`, `ListExportButton`, `DataTable` `selection`) are intact and unforked.
2. **All three references** — read inventory, work-orders, and adjustments at each layer of the table above. They are the install spec.
3. **Target module** — read its `data/list-{m}-request.ts` (is the list encoder exported or file-private?), its list columns + row-cell (the values to mirror), its `components/list/{m}-client.tsx` + `{m}-table.tsx`, its `app/api/{m}/route.ts` + `_validators.ts` (the list query validator to reuse), and its `packages/db/src/flooring/{m}/read-repository.ts` (is the list `where` inline or already a shared helper?).
4. **Memory** — read `csv-export-and-row-selection-epic` (the original rollout + `useListSelection`) and `consolidate-shared-not-per-module`. Treat as context; verify against code.

State what you found in one tight block (target module, list encoder exported?, where-builder shared or inline?, the row type + its server-resolved labels, the column set in scope) before proposing the change.

## Step 2 — Classify the task

- **A. Install** — the target list module has no CSV export yet. Walk all layers (Step 3) for the full manifest. Surface the column-set / divergence questions first.
- **B. Add/adjust a column** — the module already exports; add, remove, or reformat a manifest entry. Scoped to `{M}_EXPORT_COLUMNS` (+ its test); the `{M}_EXPORT_COLUMN_KEYS` set and client picker derive from it automatically.
- **C. Audit** — verify all six layers exist and the invariants hold: manifest values pure + mirror the list cell, `where`/`orderBy` reused (not re-implemented), `filters.id` handled in the shared where, cap clamped + ids capped, BOM on, `EXPORT` bucket + per-module scope, `ListExportButton` direct in `ListActionBar`, selection cleared on scope change, the three test specs present. Read-only output — report drift as a checklist, then offer to fix.
- **D. Consolidate** — a module ships a bespoke CSV writer, its own envelope parsing, a forked selection hook, or re-implements the list `where` for export instead of reusing it. Converge onto the shared serializer/parser/hook + the extracted `build{M}ListViewWhere`.

## Step 3 — Execute the layer walk

For an **install** (scope each step to the one column for an add):

1. **Domain manifest** — create `export-columns.ts` with `{M}_EXPORT_COLUMNS` (pure `value` projections reusing the row-cell's formatters); re-export through the module `index.ts` barrel.
2. **Filters type** — add `id?: ReadonlyArray<string>` to the module's list-filters type.
3. **DB export read** — if the list `where` is inline, extract `build{M}ListViewWhere(filters)` (add the `filters.id` → `{ id: { in } }` clause) and point the list read at it; add `export{M}ForListView({ filters, sort?, take })` reusing it + the shared order-by. New exports auto-barrel via `export *`.
4. **Application use case** — create `export-{m}.ts`: `resolveExportRowCap` + resolve filters/sort (mirror the list use case) + `normalizeIdFilter(ids)` → `filters.id` + the db read; return `{ rows, total }`. Add to the application barrel.
5. **API validator** — add `{M}_EXPORT_COLUMN_KEYS` + `validate{M}ExportRequest` (reuse `parseExportEnvelope` + the list query validator) to `_validators.ts`.
6. **API route** — create `app/api/{m}/export/route.ts` (POST) per the table: `applyRoutePolicy` + `EXPORT` scope → validate → use case → `toCsv`(+`pickExportColumns`, `{bom:true}`) → `routeCsv` with the `x-export-*` headers.
7. **Client query builder** — export `build{M}ListSearchString`; add `build{M}ExportQuery` (strip `page`/`pageSize`).
8. **Client + table** — wire `useListSelection`, `selectionEnabled`, the scope-clear effect, the export memos, `<ListExportButton>` in `ListActionBar`, and the table `selection` prop.
9. **Tests** — manifest spec, use-case spec (mock `@builders/db`), query-builder spec.

## Step 4 — Verify

- **Build order:** build `@builders/domain` → `@builders/db` → `@builders/application` (the use case consumes the export read via dist), then `npm run typecheck`. No `db:generate` — there's no schema change.
- **Targeted tests:** the domain manifest spec, the application use-case spec, and the web query-builder spec. Then **the full suite** (`/check`) — the export touches domain, db, application, and web.
- **Invariant sanity:** manifest values pure + mirror the list cell (live relations, Eastern timestamps, `""` for nulls); `where`/`orderBy` reused; `filters.id` honored in the shared where; cap clamped to 5000 + ids capped; `{bom:true}`; route on `EXPORT` bucket with `{m}.export` scope and no mutation gauntlet; `ListExportButton` direct in `ListActionBar`; selection cleared on scope change + toggle-off.
- **UI sanity (optional, `/run`):** open the list, apply a filter + sort, Export → file matches the on-screen scope, has a BOM, the picked columns, and the intended exclusions; tick rows → only those export; change a filter with ticks → selection clears; force the cap → "first N of M" message.
- Report real counts. For an **audit**, walk each layer against the checklist and report which carry the export vs which drifted/forked.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**.

```
CSV-EXPORT — <module> — <install | add-column | audit | consolidate>   (read-only   scope: <m>.export   cap 5000)

═══ Grounding ═══
Target: <module>   List encoder exported: <yes/no>   Where-builder: <shared | extracted>   Reference: <inventory | work-orders | adjustments>
Columns: <set>   Intentional exclusions: <e.g. cost/freight, or none>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Domain manifest | packages/domain/src/flooring/<m>/export-columns.ts (+ barrel) | ✅ {M}_EXPORT_COLUMNS (pure values) |
| Filters type | packages/domain/src/flooring/<m>/types.ts | ✅ id? added |
| DB export read | packages/db/src/flooring/<m>/read-repository.ts | ✅ export<M>ForListView + shared where (id IN) |
| App use case | packages/application/src/flooring/<m>/export-<m>.ts (+ barrel) | ✅ cap + filters + ids merge |
| API validator | app/api/<m>/_validators.ts | ✅ EXPORT_COLUMN_KEYS + validate<M>ExportRequest |
| API route | app/api/<m>/export/route.ts | ✅ POST · EXPORT scope · toCsv · routeCsv |
| Client query | modules/<m>/data/list-<m>-request.ts | ✅ export encoder + build<M>ExportQuery |
| Client + table | modules/<m>/components/list/<m>-client.tsx + <m>-table.tsx | ✅ useListSelection + ListExportButton + selection prop |
| Tests | domain manifest + app use case + web query-builder | ✅ |

═══ Verify ═══
build domain→db→application → typecheck: <PASS | N errors>   Targeted + full suite: <domain/app/web counts>
where reused · filters.id honored · cap 5000 · BOM · EXPORT bucket · ListExportButton in bar · scope-clear: <ok | …>

═══ Open questions ═══
- <column set / exclude UI-hidden cols / include actor cols, or "none">

═══ Commit message ═══
<≤17 words; schema-free, no migration>
```

## What this skill does NOT do

- Act on the done/candidate map without re-reading the live shared machinery + all three references + the target first.
- Fork the shared serializer (`toCsv`/`pickExportColumns`/`ExportColumn`), the `parseExportEnvelope` parser, the `routeCsv`/`EXPORT` helpers, or the `useListSelection`/`ListExportButton` UI — a bespoke copy is a **consolidate** job.
- Re-implement the list `where`/`orderBy` for export — reuse the shared builders so the file matches the on-screen scope; if the where is inline, extract it (don't duplicate).
- Route the export through the **mutation gauntlet** or the shared **list-browse** rate-limit bucket — it's read-only on its own `EXPORT` bucket with a per-module `scope`.
- Wrap `ListExportButton` in a `ToolbarMenuButton`, pass `selection` to the table when selection is off, or forget to clear ticks on scope change / toggle-off.
- Project raw/snapshot columns or impure values into a manifest — values are pure, reuse the row-cell formatters, mirror the server-resolved labels (live relations), render Eastern timestamps, and emit `""` for nulls.
- Invent a column the list doesn't show, or silently include/exclude a UI-hidden column (cost/freight) or actor columns — that's a product question to **surface**.
- Drop the UTF-8 BOM, the 5000 cap (`resolveExportRowCap` + the `ids` cap in `parseExportEnvelope`), or the `x-export-total`/`x-export-count` truncation headers.
- Import `@builders/db` from a web test (dist trap) — keep the db mock in the application use-case test.
- Add a schema **column** to make something exportable — a missing field is a `/session-new` job (adding `id?` to the filters TYPE for the ticked-rows scope is in scope).
- Redesign `ListExportButton`, `useListSelection`, or the `DataTable` selection seam — that's **/engine**.
- Touch the multi-column Sort tool → **/column-sort**; `createdBy`/`updatedBy` columns → **/column-actor**; the PaletteColor chip → **/column-color**; the record-# sequence → **/column-rownumber**.
- Plan or execute whole-module work, or author another skill → **/session-new** / **/newskill**.
- Commit, run migrations, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/table-csv-export` invocation.
