---
name: column-color
description: Master of the editable PaletteColor palette-tag column across the schema → domain → data → application → api → module-UI → tests stack — the shared 12-value enum, the list-cell CellChip that recolors a record's identity cell, and the PaletteColorDropdown in the record form that lets a user re-select the color. Invoke to install the palette tag onto a candidate module, audit an existing install for layer drift, or fold a per-module fork back onto the one shared source. Knows the color is a non-semantic visual tag — metadata-only — and refuses to let a color change trip any recompute. Editing skill, not read-only. Explicit-only — invoke on /column-color.
---

# /column-color

`/column-color` makes you the owner of the **palette-color column** — the user-assigned, non-semantic `PaletteColor` visual tag, its `CellChip` that recolors a record's identity cell in the list, and the `PaletteColorDropdown` that lets a user re-select it in the record form. The user invokes it with a free-form intent — "install the color tag on templates", "audit the inventory color install for drift", "fold a copied dropdown back onto the shared one". Your job: ground in the live palette map, confirm the shared machinery, and drive the color column through every layer it touches.

This is an **editing** skill — it reads, classifies, then makes the change across the stack. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`). The neighbor `/row-number` treats this chip as its optional "Piece 4"; **this skill owns it end to end.**

## The model (what the palette-color column IS)

The column is **one editable enum threaded across the layer spine**. It is a **non-semantic visual tag** — meaningless in code, purely a user-assigned color — so it passes straight through every layer with **no domain rule and no recompute**. The chip wraps a record's identity cell (the `# ` number cell on the modules done so far); the dropdown re-selects it.

`schema (enum + column + 1 migration) → domain palette value-object passthrough → data selects/normalizers/write-repo → application metadata-only input → api requireColor guard → module UI CellChip + PaletteColorDropdown → tests`

**Edit-only is the standard scope.** The only place a user picks a color is the record-view **edit** form; **create paths are never wired** — new rows fall to the DB default `SLATE` everywhere (manual create forms, the import/worker materialize path, seed). That is intended, not a gap. So a new install wires `requireColor` on the **update** validator only; it does **not** add `colorOrDefault` or a create-form dropdown.

### The shared machinery (never fork it — `consolidate-shared-not-per-module`)

One source per concern; every module converges on it:

- **Postgres enum** `PaletteColor` (12 values: SLATE RED AMBER ORANGE LIME GREEN TEAL CYAN BLUE VIOLET PINK ROSE) in `packages/db/prisma/schema.prisma`. It was first born as `FlooringEntityTypeColor` and renamed neutral in `migrations/20260624120000_share_palette_color_work_order` — the name carries **no module prefix** on purpose.
- **Domain value-object** `packages/domain/src/shared/palette.ts` — `PaletteColor` type, `PALETTE_COLOR_VALUES`, `DEFAULT_PALETTE_COLOR = "SLATE"`, `isPaletteColor`, `PALETTE_COLOR_INVALID_MESSAGE`. Pure data, no I/O. This is the persistence/validation source of truth.
- **UI**, both from `@/engines/common`: `PaletteColorDropdown` (`apps/web/engines/common/controls/palette-color-dropdown.tsx`) — the editable picker in the form; `CellChip paletteColor={row.color}` (`apps/web/engines/common/badges/cell-chip.tsx`) — wraps the identity cell. The class/label maps live in `apps/web/engines/common/badges/contracts/color-palette.ts`, which **sources its values + type from the domain palette** — keep that one-directional.

### The canonical per-layer wiring (reference: **work-orders**)

| Layer | File(s) | The color seam |
|---|---|---|
| Schema + 1 migration | `schema.prisma` (`color PaletteColor @default(SLATE)`, WO line ~246) · `migrations/<ts>_<module>_palette_color/migration.sql` | `ALTER TABLE … ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE'` (existing rows backfill to SLATE) |
| Domain | `domain/src/flooring/work-orders/types.ts:6,63,80` (row + form types) · `normalizers.ts:22,65` | `color: PaletteColor` on the row/form types; form init `color: DEFAULT_PALETTE_COLOR`; normalizer passthrough |
| Data | `db/src/flooring/work-orders/shared.ts:14,43` (`color: true` in the select shapes) · `write-repository.ts:14` (`color?: PaletteColor`) | `color: true` in **every** select; passthrough in insert/update data |
| Application | (no dedicated color logic) | color rides the **update** input object unread — **metadata-only, never recomputed**; the create input never carries it |
| API | `app/api/work-orders/_validators.ts` (`requireColor` ~L88; update `if ("color" in body) input.color = requireColor(body.color)` L156) | update = strict-when-present. *(WO/entity-types also historically wired `colorOrDefault` on create — a new edit-only install skips that; create defaults to SLATE in the DB.)* |
| UI — list cell | `modules/work-orders/components/list/table/work-orders-row-cell.tsx:17` | `case "workOrderNumber": return <CellChip paletteColor={row.color}>{row.workOrderNumber}</CellChip>` |
| UI — record form | `modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx:196` | `<PaletteColorDropdown value={draft.color} onChange={(color) => onFieldChange("color", color)} ariaLabel="…" />` |
| Tests | application/web | color passthrough proves no recompute; invalid value → `PALETTE_COLOR_INVALID_MESSAGE` |

### Done vs candidate (verify against the schema each run — this drifts)

- **Palette tag — done (4):** FlooringWorkOrder, FlooringEntityType, FlooringInventoryAdjustment, FlooringInventory. (`palette-color-sharing-epic`.) The **adjustments** chip won't light up — its inv# is a frozen snapshot, not a join (`adjustment-invnumber-join-pending`).
- **Candidate:** any record module that already shows a `# ` identity cell and lacks the tag — e.g. FlooringProperty, FlooringTemplate, FlooringJobType, FlooringPayment, FlooringWarehouse, FlooringProduct. Re-derive this from the live schema each run; don't treat the list as a roadmap.
- **⚠️ Name collision — a target may already own a `color` that means something else.** FlooringProduct, for one, has a free-text *physical* `color String?` with its own trgm GIN (`schema.prisma` ~L195) — a different concept from the palette tag. Where that happens the palette column must take a **distinct name** (e.g. `paletteColor`); do not overload the existing string. Surface it as an open question before installing.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-scan `schema.prisma` for the `PaletteColor` enum + every `color`/`paletteColor` field, and confirm the shared domain + `@/engines/common` machinery is intact. The done/candidate map above drifts; never act on it without confirming against live code.
- **Palette color is a non-semantic tag — metadata-only, NEVER recompute.** It passes through every layer with no domain rule. A color change must touch **zero** stock / ledger / total / netDeducted math. (This is the whole point of the column.)
- **One shared source — never fork per module** (`consolidate-shared-not-per-module`). Reuse the enum `PaletteColor`, the domain `packages/domain/src/shared/palette.ts`, and the `@/engines/common` `PaletteColorDropdown` + `CellChip`. If a module already copied any of these, **converge it back**, don't add a parallel copy. The UI contracts map sources its values **from** the domain palette — keep that one-directional.
- **Edit-only is the standard scope — never wire create.** The only color picker is the record-view edit form; create/import/worker/seed paths fall to the DB default `SLATE` everywhere (intended). So a new install adds `requireColor` (strict-when-present, invalid → `PALETTE_COLOR_INVALID_MESSAGE`) on the **update** validator only — **no `colorOrDefault`, no create-form dropdown**. Don't invent a third validator; mirror inventory's `_validators.ts`.
- **Migration adds NOT NULL DEFAULT 'SLATE'** so existing rows backfill — one `ADD COLUMN` migration per install (precedent `migrations/20260624140000_inventory_palette_color`). Author the SQL with double-quoted identifiers. If the target already owns a different `color`, name the new column distinctly. **The user runs migrations — never `db:deploy`.**
- **dist-rebuild order before typecheck.** After editing `@builders/domain`/`@builders/db` types, run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck` sees the new field.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; the schema change is its own commit. The user runs migrations.
- **Drive, don't multiple-choice.** Surface genuine open questions (column-name collision, a missed select copy, whether the chip's identity cell exists yet) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/column-color`. Not on "add a color", "give it a color chip", "let users pick a color".

## Step 1 — Ground in the live palette map

Before classifying the task, read the current reality:

1. **Schema** — scan `packages/db/prisma/schema.prisma` for the `PaletteColor` enum + every `color`/`paletteColor` field. Confirm the target is a candidate (or, for an audit, already done), and **check for a pre-existing `color`** on the target (the name-collision case).
2. **Shared machinery** — confirm the domain `packages/domain/src/shared/palette.ts` exports + the `@/engines/common` `PaletteColorDropdown` / `CellChip` are present and unforked.
3. **Reference impl** — read **inventory**'s seam at each layer (the edit-only canonical, the standard scope); cross-check work-orders for the cell/dropdown wiring (it additionally wired create, which a new install skips).
4. **Memory** — read `palette-color-sharing-epic` (the per-pass wiring + per-module caveats, incl. inventory's edit-only scope), `consolidate-shared-not-per-module` (one source, converge both), `adjustment-invnumber-join-pending` (snapshot caveat), and `author-migration-with-schema-edit`. Treat as context; verify against code.

State what you found in one tight block (target module, identity cell, machinery intact?, name collision?, reference impl) before proposing the change.

## Step 2 — Classify the task

Match the user's ask to one of these:

- **A. Install** — the target is a candidate; confirm the identity cell + column name (collision?), then walk the layers (Step 3) at edit-only scope.
- **B. Audit** — the target claims to be done; verify each layer carries no drift (a missing `color: true` select copy, a color read in app/recompute code, a forked dropdown, a missing API guard, a chip not wired to the cell). Read-only output — report gaps as a checklist, then offer to fix.
- **C. Consolidate / dedupe** — a module copied the enum / domain palette / dropdown / cell-chip; converge it onto the shared source (work-orders is canonical), dropping the per-module variance.

## Step 3 — Execute the layer walk

For an **install** (edit-only is the standard scope — create is never wired):

1. **Schema + 1 migration** — add `color PaletteColor @default(SLATE)` to the target model (or a distinct name if `color` is taken). Author the `ADD COLUMN … NOT NULL DEFAULT 'SLATE'` SQL (existing rows backfill to SLATE).
2. **Domain** — add `color: PaletteColor` to the row + form types in `packages/domain/src/.../types.ts`, init the form to `DEFAULT_PALETTE_COLOR`, and pass it through the normalizer. Reuse `packages/domain/src/shared/palette.ts` — no new value-object, no domain rule.
3. **Data** — add `color: true` to **every** select shape; pass the field through the write-repo **update** data (`color?: PaletteColor`) + the normalizer.
4. **Application** — the **update** input carries `color` **unread** — metadata-only, no recompute. The create input does **not** gain color (new rows default to SLATE in the DB).
5. **API** — in `_validators.ts`, the **update** validator only: `if ("color" in body) input.color = requireColor(body.color)`. No `colorOrDefault`, no create-path color.
6. **Module UI** — wrap the identity cell in the row-cell switch: `<CellChip paletteColor={row.color}>{row.<numberField>}</CellChip>`; add `<PaletteColorDropdown value={draft.color} onChange={(color) => onFieldChange("color", color)} />` to the **record-view edit** form's primary fields section + wire the form draft/dirty + the update mutation hook. No create-form picker.
7. **Tests** — color passthrough proves no recompute; an invalid update value fails with `PALETTE_COLOR_INVALID_MESSAGE`; a created row defaults to SLATE.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck`. Don't typecheck before the dist rebuild — it won't see the new field.
- **No-recompute sanity:** a color change touches no stock / ledger / total / netDeducted math — grep the app layer to prove `color` is never read there.
- **Guard sanity:** a created row → SLATE (DB default, create never accepts color); update with an invalid color → `PALETTE_COLOR_INVALID_MESSAGE`; update with a valid color → persisted.
- **Chip sanity:** the list identity cell recolors live; the dropdown re-selects and the chip follows.
- Run the module's app-layer tests. Report real counts. For an **audit**, walk each layer against the checklist and report which carry the column vs which drifted.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-COLOR — <module> — <install | audit | consolidate>   (scope: edit-only   column: <color | paletteColor>)

═══ Grounding ═══
Target: <module>   Identity cell: <numberField>   Machinery intact: <yes/no>   Name collision: <none | color taken → paletteColor>   Reference: inventory (edit-only)

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + migration | schema.prisma · migrations/<ts>_<module>_palette_color | ✅ authored (unrun), NOT NULL DEFAULT SLATE |
| Domain | domain/src/.../types.ts + normalizers (+ shared/palette reuse) | ✅ passthrough, no rule |
| Data | db/src/.../{shared,write-repository}.ts | ✅ color:true in every select + write passthrough |
| Application | application/src/.../*.ts | ✅ update metadata-only (color never read); create untouched |
| API | app/api/<module>/_validators.ts | ✅ requireColor on update only (no create-path color) |
| UI | modules/<module>/...row-cell + primary-fields-section | ✅ CellChip on # cell + PaletteColorDropdown (edit form) |
| Tests | application|web tests | ✅ passthrough + DB-default + invalid-message |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
no-recompute · guard · chip-recolors: <ok | …>

═══ Open questions ═══
- <column-name collision / missing identity cell / migration timing, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Act on the done/candidate map without re-scanning the live schema + confirming the shared machinery first.
- Add a domain rule, recompute, or any business logic to the color — it is a non-semantic visual tag, metadata-only, full stop.
- Fork the enum / domain palette / dropdown / cell-chip per module — reuse and converge the one shared source (`consolidate-shared-not-per-module`).
- Run migrations or `db:deploy` — it authors the one `ADD COLUMN` SQL file; the user runs it.
- Overload a pre-existing `color` column that means something else (e.g. a free-text physical-color string) — name the palette tag distinctly and flag it.
- Reshape the `@/engines/common` chrome (the `PaletteColorDropdown` widget, the `CellChip`, the contracts color map) — that's **/engine**.
- Own the record-# number, its sequence, exact-int search, or the stepper — that's **/row-number** (this chip is its "Piece 4").
- Touch `createdBy`/`updatedBy` actor columns → **/column-actor**; `createdAt`/`updatedAt` or their Eastern-time display → **/column-timestamp**.
- Plan or execute whole-module work, or any other column sweep → **/session-new**.
- Commit, fold the schema change into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-color` invocation.
