---
name: column-sort
description: Master of the multi-column **Sort tool** across the columns → client → record-grid → data-request → api-validator → db-order-by → tests stack — the shared SortMenuBody, the type-aware direction labels, the `?sorts=field:dir` URL codec, the per-module SORT_OPTIONS allowlist, and the pure Prisma order-by builders. Invoke to install sort onto a new list module, add a sortable column to a module that already has it, audit an existing install for layer drift, or consolidate a hand-maintained allowlist onto the one derived source. Always classifies the module shape first — key==field (inventory) vs key≠field divergence (work-orders) — because the client wiring differs. Knows every field-set layer must agree and refuses to let one drift. Editing skill, not read-only. Explicit-only — invoke on /column-sort.
---

# /column-sort

`/column-sort` makes you the owner of the **multi-column Sort tool** — the shared `SortMenuBody`, the `?sorts=field:dir,field:dir` URL contract, the per-module `SORT_OPTIONS` allowlist that drives the menu, and the pure Prisma order-by builders that turn the chosen fields into a query. The user invokes it with a free-form intent — "make properties sortable", "add a sortable Cost column to inventory", "audit the work-orders sort for drift", "fold that hand-maintained allowlist onto SORT_OPTIONS". Your job: ground in the live two-module reference (inventory + work-orders), classify the module shape, and drive the sort field through every layer it touches so **no allowlist drifts**.

This is an **editing** skill — it reads, classifies, then wires the field across the stack. It is not a read-only audit (that's `/report`/`/dig`) and not a whole-module plan (that's `/newsession`). The Sort tool is **proven on exactly two modules** (inventory + work-orders); installing onto a third is the headline use.

## The model (what the Sort tool IS)

The tool is **one shared menu fed a per-module list of allowed fields, validated again at every server boundary, and resolved by a pure order-by builder.** A field is sortable only if **EVERY layer agrees** on it. There is no schema change anywhere — sort needs only fields/relations that already exist.

```
columns file (SORT_OPTIONS + sortable:true + derived ALLOWED) → client (defaultSortDirection [+ key↔field maps]) → record-view grid reuse (when present) → data/list-*-request.ts allowlist → app/api/*/_validators.ts allowlist → packages/db order-by.ts builder → tests (db order-by + web request-parse + allowlist-sync)
```

**The drift contract is the whole point.** Four field-set layers must hold identical sets — the menu `*_SORT_OPTIONS`, the client `*_ALLOWED_SORT_FIELDS`, the request `*_LIST_SORT_FIELDS`, and the api `*_UI_SORT_FIELDS`. Add a column to some-but-not-all and it either silently fails to sort or is rejected server-side. `apps/web/tests/modules/sort/sort-allowlist-sync.test.ts` is the catch — it fails the moment the sets diverge.

### Column key vs backend field — classify the module shape FIRST

The `field` that flows through the URL → parser → order-by is the **backend sort field**. The DataTable column it caret-decorates is the **column key**. The two modules differ, and this decides the client wiring:

- **key == field (inventory shape, the simple case).** Column keys equal backend fields (`stockBalance`, `productName`, `location`, `warehouse`). No translation maps. The client only needs a `defaultSortDirection`. Reference: `apps/web/modules/inventory/components/list/inventory-client.tsx`.
- **key ≠ field (work-orders shape, the divergent case).** Column keys (`warehouseName`, `entityName`, `propertyName`, `jobTypeName`) differ from backend fields (`warehouse`, `entity`, `property`, `jobType`). The client needs **both** maps — `SORT_FIELD_BY_COLUMN` (header click → field) and `COLUMN_BY_SORT_FIELD` (field → caret) — plus a `tableSorts` memo that reflects backend fields back onto column keys. Reference: `apps/web/modules/work-orders/components/list/work-orders-client.tsx:53-80,211-218`.

State which shape the target is before touching anything. A wrong guess here is the only thing that makes sort look broken in the UI while the query is correct.

### The shared machinery (never fork it — `consolidate-shared-not-per-module`)

- **Menu** — `apps/web/engines/list-view/toolbar/sort/sort-menu.tsx`: `SortMenuBody` + `SortMenuOption { key; label; type? }` + `SortValueType = "text"|"number"|"date"|"time"`. The `type` drives the readable direction labels (text `A→Z`, number `Low→High`, date `Oldest/Newest`, time `AM first/PM first`). Consumers pass `title="Sort by"` to the hosting `ToolbarMenuButton` (the sticky header owns the title — the body draws no header).
- **Controller** — `apps/web/engines/list-view/client/use-server-list-controller.ts`: `encodeSorts`/`parseSorts`/`normalizeSorts`, the `?sorts=` codec, `allowedSortFields`, `maxSortLevels`. `maxSortLevels > 1` activates the multi-sort URL path. **Cap is 3 everywhere.**

### The canonical per-layer wiring (reference: inventory key==field · work-orders key≠field)

| Layer | File(s) | The sort seam |
|---|---|---|
| Columns (the ONE client source) | `modules/{m}/components/list/table/{m}-list-columns.ts` | `sortable: true` on the column; a `{m}_SORT_OPTIONS` entry `{ key, label, type }`; **derived** `{m}_ALLOWED_SORT_FIELDS = {m}_SORT_OPTIONS.map((o) => o.key)`; `{m}_MAX_SORT_LEVELS = 3` |
| Client | `modules/{m}/components/list/{m}-client.tsx` | `defaultSortDirection(field)`; **key≠field only**: `SORT_FIELD_BY_COLUMN`, `COLUMN_BY_SORT_FIELD`, `tableSorts` memo |
| Record-view grid reuse (when the module has one) | `modules/inventory/controllers/record/header/use-inventory-options-grid.ts:19-31` | reuses `{m}_ALLOWED_SORT_FIELDS` + `MAX_SORT_LEVELS` so the gutter Sort picker never drifts from the list |
| Data request allowlist (independent) | `modules/{m}/data/list-{m}-request.ts` | exported `{m}_LIST_SORT_FIELDS` + `parseSortsParam` (dedupe, drop-unknown, default `desc`, cap 3) |
| API validator allowlist (independent) | `app/api/{m}/_validators.ts` | exported `{m}_UI_SORT_FIELDS` + `parseSortsParam` (same shape, `Set`-backed) |
| DB order-by builder | `packages/db/src/flooring/{m}/order-by.ts` | `{m}FieldOrderBy(field, dir)` switch → Prisma clause; `build*OrderBy` (id always last, createdAt tiebreak skipped when user-selected); `appendUniqueOrderBy`. **Type-only Prisma import, no client.** |
| Tests | `packages/db/tests/flooring/{m}/order-by.test.ts` · `apps/web/tests/modules/{m}/list-{m}-request.test.ts` · `apps/web/tests/modules/sort/sort-allowlist-sync.test.ts` | `FIELD_CLAUSE` map; parse new fields/drop-unknown/cap-3; cross-layer set equality |

### Order-by clause shapes (copy these exactly)

- **Scalar:** `case "createdAt": return { createdAt: direction }`
- **Nullable scalar** (nulls sink): `return { location: { sort: direction, nulls: "last" } }` — used for `location`, `scheduledFor`, `timeOfDay`.
- **Relation:** `case "productName": return { product: { name: direction } }`; nested `case "entity": return { property: { entity: { entity: direction } } }`.
- **Generated/aliased column:** the displayed `stockBalance` sorts on the real column → `case "stockBalance": return { stockQuantity: direction }`.
- **Tiebreak:** `id` is **always** the final clause; a `createdAt` tiebreak is appended **only when the user didn't select createdAt** (a secondary createdAt keeps its own direction — that's the regression the sweep fixed; don't reintroduce it).

### Done vs candidate (verify against live code each run)

- **Done (2):** inventory (key==field) + work-orders (key≠field). These are the references, not a roadmap.
- **Candidate:** any toolbar list module on `useServerListController` that isn't yet sortable — manufacturers, properties, templates, entities, job-types, payments, warehouses, products. Confirm the module renders the shared toolbar Sort `ToolbarMenuButton` (or wire it) before promising sort.

## Hard rules

- **Ground before you touch, and classify the shape first.** Do the Step 1 read every time. Decide **key==field (inventory) vs key≠field (work-orders)** before any edit — it determines whether the client needs the two translation maps + `tableSorts`. A wrong call here makes sort look broken in the UI while the query is fine.
- **Every field-set layer must agree.** A new sortable field touches **all four** allowlists in lockstep: menu `SORT_OPTIONS` (with a `type`), client `*_ALLOWED_SORT_FIELDS` (derived — see next rule), request `*_LIST_SORT_FIELDS`, api `*_UI_SORT_FIELDS` — **plus** the `*FieldOrderBy` case and the test specs. Missing one = silent no-sort or a server reject. The `sort-allowlist-sync` test is the guard.
- **The client allowlist is DERIVED, never hand-listed.** `*_ALLOWED_SORT_FIELDS = *_SORT_OPTIONS.map((o) => o.key)` lives in the columns file; the client + the record-view grid **import** it. If you find a hand-maintained client list, that's a consolidate job — converge it onto the derived source, don't extend it.
- **The two SERVER allowlists stay independent — defense-in-depth (confirmed scope).** `*_LIST_SORT_FIELDS` (data) and `*_UI_SORT_FIELDS` (api) are deliberately separate, each `export`ed so the sync test compares them. **Consolidate does NOT collapse them onto the client source.** They cannot import `@builders/db` either (see the dist trap).
- **Every SORT_OPTIONS entry needs a `type`** (`text|number|date|time`) — it drives the direction labels; `time` means AM-first asc (`FlooringTimeOfDay` = AM, PM). The sync test fails an option with no `type`.
- **`order-by.ts` is pure: type-only Prisma, no client, no `apps/` import.** `@builders/db` may not import `apps/`. Keep the builder a pure field→clause map. `id` is always the last tiebreak; skip the createdAt tiebreak when the user already sorts createdAt.
- **Don't "fix" `appendUniqueOrderBy`.** It dedupes by **full clause JSON, not by field** — field-level dedup happens upstream in the parsers. That's intentional.
- **The web sync test must NOT import `@builders/db`.** Web tests resolve `@builders/db` to **dist**, not src — the cross-package import is a trap. The allowlist-sync guard stays web-only (UI + data + api); db-side coverage lives in `packages/db/tests`.
- **No schema, no migration.** Sort uses existing fields/relations only. If a target lacks the field a user wants to sort by, that's a different job (`/newsession`) — surface it, don't add a column here.
- **Build db before typecheck; re-run the FULL suite.** `order-by.ts` is consumed via dist by the read-repository — build db before `typecheck`. A UI tweak can silently break `sort-menu.test.tsx`, so run the whole suite, not just the new tests.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words. No migration to run.
- **Drive, don't multiple-choice.** Surface genuine open questions (the module isn't on the shared toolbar yet; an ambiguous relation-sort path; a column with no obvious backend field) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/column-sort`. Not on "let me sort this", "add a sort", "order by".

## Step 1 — Ground in the live Sort reality

Before classifying, read the current reality:

1. **Shared machinery** — confirm `sort-menu.tsx` (`SortMenuOption`/`SortValueType`) and `use-server-list-controller.ts` (`?sorts=` codec, `maxSortLevels`, `allowedSortFields`) are intact and unforked.
2. **Both references** — read inventory (key==field) and work-orders (key≠field) at each layer of the table above. They are the install spec; mirror whichever shape the target matches.
3. **Target module** — read its columns file, client, `data/list-*-request.ts`, `app/api/*/_validators.ts`, and `packages/db/src/flooring/*/`. Confirm it renders the shared toolbar Sort button (or note it must be wired). Decide its shape (key==field vs key≠field) and whether it has a record-view options grid that reuses sort.
4. **Memory** — read `sort-menu-redesign-and-sweep` (full provenance of the menu redesign + sweep + tests) and `consolidate-shared-not-per-module`. Treat as context; verify against code.

State what you found in one tight block (target module, shape, on-toolbar?, record-grid reuse?, the field(s) in scope) before proposing the change.

## Step 2 — Classify the task

- **A. Install** — the target is a candidate list module with no sort yet. Confirm it's on the shared toolbar, pick the shape, then walk all layers (Step 3) for the full sortable set.
- **B. Add a column** — the module already sorts; add one field end-to-end. Same layer walk, scoped to the one field: `SORT_OPTIONS` (+ type) → derived allowlist (free) → server `*_LIST_SORT_FIELDS` + `*_UI_SORT_FIELDS` → `*FieldOrderBy` case → test specs.
- **C. Audit** — verify every field-set layer agrees, the client allowlist is derived (not hand-listed), the order-by has a case per field, nullable fields use `nulls:"last"`, the tiebreak invariants hold, and the sync test exists. Read-only output — report drift as a checklist, then offer to fix.
- **D. Consolidate** — a module hand-maintains its client allowlist, inlines the order-by in the read-repository, or scatters its sort config across the client instead of the columns file. Converge onto the derived `*_SORT_OPTIONS.map(key)` source + the extracted `order-by.ts`. **Leave the two server allowlists independent.**

## Step 3 — Execute the layer walk

For an **install** (or per field for an add):

1. **Columns file** — set `sortable: true` on the column; add `{ key, label, type }` to `{m}_SORT_OPTIONS`; ensure `{m}_ALLOWED_SORT_FIELDS = {m}_SORT_OPTIONS.map((o) => o.key)` and `{m}_MAX_SORT_LEVELS = 3` exist here.
2. **Client** — add the field to `defaultSortDirection` (text/time → `asc`, date/number → `desc`). **key≠field only:** add the column-key↔backend-field pair to both `SORT_FIELD_BY_COLUMN` and `COLUMN_BY_SORT_FIELD`; confirm `tableSorts` reflects it. Pass `maxSortLevels={…_MAX_SORT_LEVELS}` + `allowedSortFields={…_ALLOWED_SORT_FIELDS}` into the controller, and `title="Sort by"` on the Sort button.
3. **Record-view grid reuse** — if the module has an options grid (inventory does), it imports `{m}_ALLOWED_SORT_FIELDS` — nothing to add, just confirm it isn't a forked copy.
4. **Data request** — add the **backend field** to `{m}_LIST_SORT_FIELDS` (exported); `parseSortsParam` already dedupes/drops-unknown/caps-3.
5. **API validator** — add the same backend field to `{m}_UI_SORT_FIELDS` (exported).
6. **DB order-by** — add a `case "<field>": return <clause>` to `{m}FieldOrderBy` using the right clause shape (scalar / nullable `nulls:"last"` / relation / aliased). Don't touch the tiebreak logic or `appendUniqueOrderBy`.
7. **Tests** — add the field to the db `FIELD_CLAUSE` spec, to the web `list-{m}-request.test.ts` parse cases, and (for a new module) create `order-by.test.ts` + `list-{m}-request.test.ts` mirroring the references and extend `sort-allowlist-sync.test.ts` with the module's four sets.

## Step 4 — Verify

- **Build order:** build `@builders/db` (the read-repository consumes `order-by.ts` via dist), then `npm run typecheck`. No `db:generate` — there's no schema change.
- **Targeted tests:** `packages/db/tests/flooring/{m}/order-by.test.ts`, `apps/web/tests/modules/{m}/list-{m}-request.test.ts`, and `apps/web/tests/modules/sort/sort-allowlist-sync.test.ts` (the drift catch). Then **the full suite** — a UI change can break `tests/engines/list-view/sort-menu.test.tsx`.
- **Drift sanity:** the four field sets are identical; the client allowlist is derived; each field has an order-by case; nullable fields sink nulls; `id` is last and the createdAt tiebreak doesn't double.
- **UI sanity (key≠field):** the caret lands on the right column (the `tableSorts`/`COLUMN_BY_SORT_FIELD` reflection) and a header click sends the right backend field.
- Report real counts. For an **audit**, walk each layer against the checklist and report which carry the field vs which drifted.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**.

```
COLUMN-SORT — <module> — <install | add-column | audit | consolidate>   (shape: <key==field | key≠field>   fields: <list>)

═══ Grounding ═══
Target: <module>   Shape: <key==field | key≠field>   On shared toolbar: <yes/no>   Record-grid reuse: <yes/no>   Reference: <inventory | work-orders>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Columns | modules/<m>/components/list/table/<m>-list-columns.ts | ✅ sortable:true + SORT_OPTIONS{type} + derived ALLOWED |
| Client | modules/<m>/components/list/<m>-client.tsx | ✅ defaultSortDirection (+ key↔field maps + tableSorts if key≠field) |
| Record grid | controllers/record/header/use-<m>-options-grid.ts | ✅ reuses ALLOWED (or n/a) |
| Data request | modules/<m>/data/list-<m>-request.ts | ✅ *_LIST_SORT_FIELDS (independent) |
| API validator | app/api/<m>/_validators.ts | ✅ *_UI_SORT_FIELDS (independent) |
| DB order-by | packages/db/src/flooring/<m>/order-by.ts | ✅ *FieldOrderBy case (type-only Prisma) |
| Tests | db order-by + web request-parse + allowlist-sync | ✅ FIELD_CLAUSE + parse + set-equality |

═══ Verify ═══
build db → typecheck: <PASS | N errors>   Targeted + full suite: <web N/N, db N/N>
four sets agree · order-by case · tiebreak invariants · caret reflection: <ok | …>

═══ Open questions ═══
- <not-on-toolbar / ambiguous relation path / no backend field, or "none">

═══ Commit message ═══
<≤17 words; no migration>
```

## What this skill does NOT do

- Act on the done/candidate map without re-reading the live shared machinery + both references + the target first.
- Skip the **shape classification** (key==field vs key≠field) — the client wiring depends on it.
- Add a field to some-but-not-all of the four field-set allowlists, or hand-maintain the client allowlist instead of deriving it from `*_SORT_OPTIONS.map(key)`.
- Collapse the two **server** allowlists (`*_LIST_SORT_FIELDS`, `*_UI_SORT_FIELDS`) onto the client source — they stay independent for defense-in-depth.
- "Fix" `appendUniqueOrderBy` (it dedupes by full clause JSON by design), or break the `id`-last / skip-createdAt-tiebreak / secondary-createdAt-keeps-direction invariants.
- Import `@builders/db` from a web test (dist trap), or import `apps/` from `order-by.ts` (it's pure, type-only Prisma).
- Add a schema column or migration to make something sortable — sort uses existing fields only; a missing field is a `/newsession` job.
- Redesign the shared `SortMenuBody`, the `?sorts=` codec, or the toolbar chrome — that's **/engine**.
- Touch `createdBy`/`updatedBy` → **/column-actor**; `createdAt`/`updatedAt` display → **/column-timestamp**; the PaletteColor chip → **/column-color**; the record-# sequence/stepper → **/column-rownumber**.
- Plan or execute whole-module work, or author another skill → **/newsession** / **/newskill**.
- Commit, run migrations, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-sort` invocation.
