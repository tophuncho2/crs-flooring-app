---
name: row-number
description: Master of the record-number row# setup across the schema → domain → data → application → api → module-UI → tests stack — the Postgres sequence + generated *NumberInt column, the exact-int search bar, the record-view stepper, and the editable PaletteColor chip that wraps the number cell. Invoke to install the setup onto a candidate module, audit an existing install for layer drift, or consolidate divergent ones. Always classifies the stepper shape first — global int-sequence vs per-parent keyset — because the neighbor query differs. Knows the number is DB-generated and refuses to app-stamp it. Editing skill, not read-only. Explicit-only — invoke on /row-number.
---

# /row-number

`/row-number` makes you the owner of the record-number **row# setup** — the sequential `PREFIX-N` number, its exact-int search bar, its record-view stepper, and the editable color chip that wraps the number cell. The user invokes it with a free-form intent — "install the number + stepper on categories", "audit the payments row# install for drift", "fold the per-module palette fork back onto the shared chip". Your job: ground in the live row# map, classify the **stepper shape**, and drive the change through every layer the setup touches.

This is an **editing** skill — it reads, classifies, then makes the change across the stack. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`).

## The model (what the row# setup IS)

The setup is **three related pieces** stitched across the layer spine. They relate through the number: the **chip wraps the number cell**, and the **stepper walks records ordered by the number**.

`schema (+ 2 migrations) → domain types → data selects/normalizers/queries → application use-cases → api routes → module UI → tests`

### Piece 1 — The number column (DB-generated, never app-stamped)

Per model, two database objects own the number; the app reads them and **never writes them** (the row#'s analogue of `/column-timestamp`'s DB-owned `updatedAt`):

- A dedicated **sequence** + a `PREFIX-N` **display string** column whose `DEFAULT` concatenates the prefix and the sequence: `DEFAULT ('STORE-' || nextval('flooring_warehouse_number_seq')::text)`.
- A generated **int** column `*NumberInt INTEGER GENERATED ALWAYS AS (CAST(SUBSTRING("prefix_col" FROM <offset>) AS INTEGER)) STORED` — the DB derives it from the string on every insert. The `<offset>` = prefix length + 1.

Installing the number is therefore **two migrations**: (1) sequence + string column, (2) the generated int column + its btree index. Reference SQL: `packages/db/prisma/migrations/20260622140000_warehouse_store_number/migration.sql` and `…140100_warehouse_number_int_generated_column/migration.sql`. New sequences start at 1 (no `START`).

| Model | Prefix | Offset (`FROM`) |
|---|---|---|
| FlooringWarehouse | `STORE-` | 7 |
| FlooringInventory | `INV-` | 5 |
| FlooringWorkOrder | `WO-` | 4 |
| FlooringPayment | `PAY-` | 5 |
| FlooringProduct | `PROD-` | 6 |
| FlooringJobType | `JT-` | 4 |
| FlooringTemplate | `TP-` | 4 |
| FlooringProperty | `PROP-` | 6 |
| FlooringInventoryAdjustment | `ADJ-` | 5 |
| FlooringEntityType | `ET-` | 4 |

### Piece 2 — Exact-int search (not substring)

The `# ` list bars match the **exact integer**, not a trigram substring. A `DebouncedSearchControl` (`apps/web/engines/list-view/toolbar/search/`) feeds a data-layer clause: strip non-digits, `parseInt`, point-lookup the int column with a `-1` sentinel for non-numeric input (sequences are always positive):

```ts
const digits = raw.replace(/\D/g, "")
const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
clauses.push({ <field>NumberInt: { equals: Number.isInteger(parsed) ? parsed : -1 } })
```

Typing `12` finds `INV-12` only — never `INV-120`. Refs: warehouse `read-repository.ts` storeNumber clause, work-orders `read-repository.ts` `buildWorkOrdersWhere`. Converting a string column to exact-int means the old number trgm GIN is dead weight — drop it in the same migration set (precedent `migrations/20260616130000_drop_number_trgm_indexes`). Memory: `exact-number-search-standard`.

### Piece 3 — The stepper (two shapes — classify before touching)

A dumb `RecordStepper` (`◀ <label> ▶`) + a global `RecordStepperPortal` (owns the dirty/discard swap guard, portals to `record-stepper-slot`) live in `apps/web/engines/record-view/shell/`, exported from `@/engines/record-view`. The neighbor query is what diverges:

1. **Global** (reference: **warehouse**, **work-orders**, **payments**) — walks the int sequence via shared `numberNeighborQueries(field, currentInt)` (`packages/db/src/shared/number-neighbors.ts`): `findFirst` for the largest `*NumberInt < current` (prev) and smallest `> current` (next). The `RecordStepperPortal` mounts in the module's `*-detail-client.tsx`; stepping navigates between full record routes.
2. **Per-parent** (reference: **inventory adjustments**, the only one) — an **inline** `RecordStepper` (not the portal) scoped to one parent, ordered by **keyset `(createdAt DESC, id DESC)`** — NOT the int sequence — via `getAdjustmentNeighbors` (`packages/db/src/flooring/inventory/adjustments/read-repository.ts`) + `/api/inventory/[id]/adjustments/[adjustmentId]/neighbors`, fetched client-side and rendered in the section's detail face (`apps/web/modules/inventory/components/record/inventory-record-view.tsx`).

Picking the wrong shape corrupts the install. Do not invent a third. Memory: `adjustment-invnumber-join-pending`.

### Piece 4 — The palette chip (optional overlay)

An **editable** `PaletteColor` column wraps the number cell with a colored chip. It is **metadata-only — never trips a recompute**. Machinery is shared, not per-module:

- Enum `PaletteColor` (12 values) in `schema.prisma` + domain mirror `packages/domain/src/shared/palette.ts` (`PALETTE_COLOR_VALUES`, `DEFAULT_PALETTE_COLOR="SLATE"`, `isPaletteColor`, `PALETTE_COLOR_INVALID_MESSAGE`).
- UI in `@/engines/common`: `PaletteColorDropdown` (editable picker in the form) + `CellChip paletteColor={row.color}` wrapping the number in the list cell / record view.
- API guards: create = `colorOrDefault` (default-on-missing), update = `requireColor` (strict-when-present).

Reference: **work-orders** (`work-orders-row-cell.tsx` wraps `workOrderNumber` in `CellChip`; `work-order-primary-fields-section.tsx` hosts the dropdown). Memory: `palette-color-sharing-epic`, `consolidate-shared-not-per-module`.

### Done vs candidate (verify against the schema each run — this drifts)

- **Number + search + stepper — done (10):** FlooringWarehouse, FlooringInventory, FlooringWorkOrder, FlooringPayment, FlooringProduct, FlooringJobType, FlooringTemplate, FlooringProperty, FlooringInventoryAdjustment, FlooringEntityType.
- **Palette chip — done (4 of those 10):** FlooringWorkOrder, FlooringInventory, FlooringInventoryAdjustment, FlooringEntityType. *(Adjustments' inv# chip won't light up — inv# is a frozen snapshot, not a join; see `adjustment-invnumber-join-pending`.)*
- **N/A:** FlooringImportEntry numbers via plain `Int @default(autoincrement())` — no `PREFIX-N`, not a target.
- **Candidate:** FlooringCategory, FlooringUnitOfMeasure; row-item tables (FlooringTemplateItem, FlooringWorkOrderItem) and joins are not stepper-capable records.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-scan `packages/db/prisma/schema.prisma` for `*NumberInt` / sequences / `PaletteColor`, and re-find the search + stepper seams. The done/candidate maps above drift; never act on them without confirming against the live schema.
- **The number is DB-generated — NEVER stamp it from app code.** The sequence + `DEFAULT ('PREFIX-' || nextval)` concat + `GENERATED ALWAYS AS … STORED` own the value. The app reads it; it never sets `*Number` or `*NumberInt`. (Parallel to `/column-timestamp` refusing to app-stamp `updatedAt`.)
- **Two migrations per number install** — (1) sequence + `PREFIX-N` string column, (2) the generated `*NumberInt` (`SUBSTRING … FROM <prefixlen+1>`, STORED) + its btree index. Author both with double-quoted identifiers; new sequences start at 1 (no `START`). The user runs them — never `db:deploy`.
- **Exact-int search, not substring.** `\D`-strip → `parseInt` → `{ <field>NumberInt: { equals: parsed ?? -1 } }`; drop any now-dead number trgm GIN in the same migration set. Don't ILIKE the number string.
- **Classify the stepper shape first.** Global (int-sequence `numberNeighborQueries`, `RecordStepperPortal`) vs per-parent (keyset `(createdAt, id)` scoped to a parent, inline `RecordStepper`, `get*Neighbors` + nested route). Picking wrong corrupts the install; don't invent a third.
- **Palette color is metadata-only — NEVER recompute.** Create = `colorOrDefault`, update = `requireColor` strict-when-present; the `CellChip` wraps the number cell; reuse the shared `@/engines/common` + `packages/domain/src/shared/palette.ts` machinery — don't fork it per module (`consolidate-shared-not-per-module`).
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed via built `dist/`. After editing their types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck` sees the new fields.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; schema changes are their own commit. The user runs migrations.
- **Drive, don't multiple-choice.** Surface genuine open questions (stepper shape, whether a candidate also wants the chip, a missed select copy) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/row-number`. Not on "add a record number", "make it steppable", "give it a color".

## Step 1 — Ground in the live row# map

Before classifying the task, read the current reality:

1. **Schema** — scan `packages/db/prisma/schema.prisma` for `*NumberInt` columns + their sequences and any `PaletteColor` (`color`) field across every model. Confirm the target is a candidate (or, for an audit, already done) and note its prefix + offset.
2. **Search** — read the exact-int clause in the target's (or reference's) `read-repository.ts` (`\D`-strip → parseInt → `{ equals: parsed ?? -1 }`) and confirm whether a number trgm GIN still exists to drop.
3. **Stepper** — locate the neighbor seam: global via `numberNeighborQueries` (`packages/db/src/shared/number-neighbors.ts`) vs per-parent keyset via a `get*Neighbors` + nested `/neighbors` route. Decide which shape the target needs.
4. **Memory** — read `exact-number-search-standard` (exact-int bars + `*NumberInt`), `warehouse-store-number-epic` (the cleanest end-to-end install), `palette-color-sharing-epic` (shared chip, metadata-only), `adjustment-invnumber-join-pending` (per-parent stepper + the snapshot caveat), and `author-migration-with-schema-edit`. Treat as context; verify against code.

State what you found in one tight block (target module, pieces present, stepper shape, reference impl) before proposing the change.

## Step 2 — Classify the task

Match the user's ask to one of these:

- **A. Install** — the target is a candidate; pick the pieces (number / search / stepper / chip) and the stepper shape, then walk the layers (Step 3).
- **B. Audit** — the target is (or claims to be) done; verify each layer/piece carries no drift (missing select copy, a number stamped in app code, substring search left in, a forked palette chip, a missing `/neighbors` route). Read-only output — report gaps as a checklist, then offer to fix.
- **C. Consolidate / dedupe** — two+ modules diverged; converge them on the canonical shape (warehouse for number+search+stepper, work-orders for the chip), dropping per-module variance — e.g. fold a per-module palette fork back onto the shared `@/engines/common` machinery.

## Step 3 — Execute the layer walk

For an **install** (piece + stepper-shape branches noted inline):

1. **Schema + 2 migrations** — add the `PREFIX-N` string column (sequence + `DEFAULT` concat) and the generated `*NumberInt` (`SUBSTRING … FROM <prefixlen+1>`, STORED) + btree index to the target model in `packages/db/prisma/schema.prisma`. Author the two SQL files; drop any now-dead number trgm GIN. *(Chip: add `color PaletteColor @default(SLATE)` + its own ADD-COLUMN migration.)*
2. **Domain** — add `<x>Number: string` (and `<x>NumberInt` where the row type carries it) to the row + list-row types in `packages/domain/src/.../types.ts`. *(Chip: add `color: PaletteColor` to the row + form types, init to `DEFAULT_PALETTE_COLOR`, reusing `packages/domain/src/shared/palette.ts`.)*
3. **Data** — add the number fields to **every** select shape + normalizer passthrough; add the exact-int clause to the list `where` builder; add the neighbor query — global `numberNeighborQueries("<x>NumberInt", currentInt)` or per-parent keyset `get<X>Neighbors` over `(createdAt, id)`. *(Chip: `color: true` in selects + normalizer passthrough.)*
4. **Application** — the read/detail use case threads the number + neighbors; the number is **never set** by a create/update use case (the DB owns it). *(Chip: create/update accept `color` as metadata-only — no recompute.)*
5. **API** — the list route's validator parses the `# ` query into the int filter; the detail route returns neighbors (per-parent: a nested `/[id]/.../neighbors` route). *(Chip: create = `colorOrDefault`, update = `requireColor` strict-when-present.)*
6. **Module UI** — add the `# ` list column (showing the `PREFIX-N` string) + a `DebouncedSearchControl` "# " bar; mount the stepper — global `RecordStepperPortal` in `*-detail-client.tsx`, or inline `RecordStepper` in the section's detail face for per-parent. *(Chip: wrap the number cell in `CellChip paletteColor={row.color}` and add the `PaletteColorDropdown` to the record form.)*
7. **Tests** — exact-int match incl. the `-1` sentinel for non-numeric input; neighbor ordering (global int sequence vs per-parent keyset); color passthrough proves no recompute.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck`. Don't typecheck before the dist rebuild — it won't see the new fields.
- **Exact-search sanity:** `12` matches only `PREFIX-12`, never `PREFIX-120`; a non-numeric query matches nothing via `-1`.
- **Stepper-order sanity:** global steps the int sequence (prev = largest `< current`, next = smallest `> current`); per-parent steps keyset `(createdAt DESC, id DESC)` scoped to the parent.
- **Palette no-recompute:** a color change touches no stock/ledger/total math.
- Run the module's app-layer tests. Report real counts. For an **audit**, walk each layer/piece against the checklist and report which carry the setup vs which drifted.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-ROWNUMBER — <module> — <install | audit | consolidate>   (stepper: <global | per-parent>   pieces: <number | search | stepper | palette>)

═══ Grounding ═══
Target: <module>   Pieces present: <…>   Stepper: <global | per-parent>   Reference: <warehouse | inventory-adjustments | work-orders>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + 2 migrations | schema.prisma · migrations/<ts>_<module>_number · …_number_int_generated_column | ✅ authored (unrun) |
| Domain | domain/src/.../types.ts (+ shared/palette) | ✅ |
| Data | db/src/.../{shared,read-repository}.ts · shared/number-neighbors | ✅ exact-int + neighbors |
| Application | application/src/.../*.ts | ✅ number DB-owned (not set) |
| API | app/api/<module>/... (+ /neighbors for per-parent) | ✅ filter + colorOrDefault/requireColor |
| UI | modules/<module>/... | ✅ # col + # bar + stepper (+ CellChip/dropdown) |
| Tests | application|web tests | ✅ exact-int(-1) + neighbor-order + color-passthrough |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
exact-search · stepper-order · palette-no-recompute: <ok | …>

═══ Open questions ═══
- <stepper shape / chip wanted? / dead trgm GIN / migration timing, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Act on the done/candidate maps without re-scanning the live schema + the search/stepper seams first.
- App-stamp the record number, or hand-write `*Number`/`*NumberInt` — the DB sequence + generated column own them.
- Run migrations or `db:deploy` — it authors the two SQL files (plus the chip migration); the user runs them.
- Substring/ILIKE the number string, or leave a now-dead number trgm GIN behind.
- Recompute anything on a palette-color change, or fork the shared palette machinery per module — that's `consolidate-shared-not-per-module`.
- Reshape the record-view / list-view / common **engine** chrome (the stepper portal, the dropdown widget, the search control) — that's **/engine**.
- Touch `createdBy`/`updatedBy` actor columns → **/column-actor**; `createdAt`/`updatedAt` or their Eastern-time display → **/column-timestamp**.
- Plan or execute whole-module work, or any other column sweep → **/session-new**.
- Commit, fold the schema change into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/row-number` invocation.
