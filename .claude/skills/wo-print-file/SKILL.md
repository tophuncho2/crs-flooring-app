---
name: wo-print-file
description: Master of the work-order PRINT FILE — the browser-native print surface built from a pure domain HTML builder + a client checkbox configurator (NOT a server PDF). Owns the full stack across the file-generation domain dir → data read projection → configurator → print page → tests. Invoke to add or move a top-section field, add/adjust an adjustment or material column, tweak the print layout/CSS, extend the read projection, or audit an existing change for layer drift. Knows the config-driven single-source contract cold (one key list drives BOTH the checkbox AND the gated cell) and that print is client-side `window.print()` — the `@builders/pdf` package is orphaned, never wire into it. Editing skill, not read-only. Explicit-only — invoke on /wo-print-file.
---

# /wo-print-file

`/wo-print-file <change>` makes you the owner of the **work-order print file** — the
on-demand document a user prints from the WO record panel or the list row ⋮ menu.
Reach for it to add or move a top-section field (Date, Warehouse, Description, …),
add/adjust an adjustments or requested-material column, retune the print layout, or
extend the joined read projection. It is an **editing** skill: it reads the stack
end-to-end, classifies the change, threads it through every layer that class
touches, updates the file-generation tests, and reports.

## The model (how the print file actually works)

**Print is browser-native.** The old worker/puppeteer PDF path was removed. A single
**pure domain builder** emits an HTML *fragment*; a **client configurator** renders
it live and calls `window.print()`. There is no `<html>`/`<body>` here (the Next
root layout supplies those), and no server round-trip to print.

**`@builders/pdf` is orphaned** — `packages/pdf` still declares `renderHtmlToPdf` and
sits in `packages/application/package.json` as a dep, but nothing calls it in the
print flow. Do **not** wire changes into it.

### File map (real paths — read these before touching anything)

- **Domain** — `packages/domain/src/work-orders/file-generation/`:
  - `types.ts` — `WorkOrderFileGenerationInput` (the joined read shape),
    `WORK_ORDER_TOP_FIELD_KEYS` + `WORK_ORDER_TOP_FIELD_LABELS`,
    `WorkOrderAdjustmentColumnVisibility` / `WorkOrderMaterialColumnVisibility`,
    `WorkOrderPrintConfig`.
  - `print-presets.ts` — `buildWorkOrderPrintConfig(preset)` (pickingTicket / slip /
    planFile seeds) + `WORK_ORDER_DOCUMENT_LABELS` (the centered doc-tag selector).
  - `build-work-order-print-html.ts` — the ONE pure entry `buildWorkOrderPrintHtml`;
    composes the top info stack + ONE mutually-exclusive bottom section by
    `config.mode` (`adjustments` XOR `material`).
  - `work-order-document-sections.ts` — the real renderers + `WO_PRINT_STYLE_BLOCK`:
    `renderWorkOrderInfo` (the top 2×2 grid + two-column band — Warehouse/Date/etc.),
    `renderWorkOrderAdjustments` + `renderAdjustmentRow` + `renderSubtotalRow`,
    `renderWorkOrderMaterialItems` (Plan File), `renderWorkOrderDocumentHeader`,
    `renderPageFrame` (repeats the header per printed page via `<thead>`).
  - `index.ts` — barrel; the whole feature is consumed via `@builders/domain`.
- **Data** — `packages/db/src/work-orders/read-repository.ts`
  `getWorkOrderForFileGeneration` projects a Prisma row into
  `WorkOrderFileGenerationInput` (warehouse block, `scheduledFor`/`timeOfDay`,
  adjustment + material groups). Server wrapper:
  `apps/web/modules/work-orders/data/queries.ts` `getWorkOrderForFileGenerationPageData`.
- **Module** —
  `apps/web/modules/work-orders/components/record/print/work-order-print-configurator.tsx`
  ("use client"): checkbox panel (`ADJUSTMENT_COLUMN_FIELDS`, the top-field map, the
  Adjustments|Requested-Material mode toggle, per-row All/None) → re-runs the pure
  builder on every toggle → live preview via `dangerouslySetInnerHTML` → **Print**
  (waits for the logo image, then `window.print()`). Trigger sites open the print
  route: `…/record/work-order-record-panel.tsx` and
  `…/list/table/work-order-row-actions.tsx`.
- **Page** — `apps/web/app/print/work-orders/[id]/page.tsx` — one standalone print
  route (RSC): auth → load → mint the presigned logo URL → render the configurator
  with `preset="pickingTicket"`. (The former 3-page picking/slip/plan split was
  consolidated onto this single route.)
- **Tests** — `packages/domain/tests/work-orders/file-generation/*`
  (`print-config`, `plan-file`, `above-table-invariant`, `adjustments-*`, `header`).

### The single-source contract (the trap)

`WORK_ORDER_TOP_FIELD_KEYS` in `types.ts` is the ONE ordered list that drives BOTH
the configurator checkbox (through `WORK_ORDER_TOP_FIELD_LABELS`) AND the gated cell
in `renderWorkOrderInfo`. **Adding a key surfaces a checkbox — but a checkbox with
no gated cell renders nothing, and a cell with no data field prints blank.** So a new
top field is a THREE-part change every time:

1. `WORK_ORDER_TOP_FIELD_KEYS` + `WORK_ORDER_TOP_FIELD_LABELS` (`types.ts`),
2. a gated cell/row in `renderWorkOrderInfo` (`work-order-document-sections.ts`),
3. the value on `WorkOrderFileGenerationInput` (`types.ts`) **and** its projection in
   `getWorkOrderForFileGeneration` (`read-repository.ts`).

The same shape holds for bottom-section columns:
`WorkOrderAdjustmentColumnVisibility` ↔ `ADJUSTMENT_COLUMN_FIELDS` (configurator) ↔
the header + `renderAdjustmentRow` + `renderSubtotalRow` cells; and
`WorkOrderMaterialColumnVisibility` ↔ the material header/row/subtotal. Every subtotal
row must carry the SAME cell count as its data rows or the table shape breaks.

## Hard rules

- **DO NOT COMMIT.** The user commits. After the change, provide a commit message of
  **≤17 words**.
- **A typical print change is domain-pure** — no schema, migration, application, api,
  or outbox. Call it out explicitly when a change *does* reach further: a new
  printed value needs the **data read projection** extended
  (`getWorkOrderForFileGeneration` + `WorkOrderFileGenerationInput`), never a new DB
  column unless the value genuinely doesn't exist yet (that's a `/column-*` job).
- **Honor the single-source contract.** Never add a configurator checkbox without its
  gated cell, and never add a cell without its key + its projected data field. Keep
  subtotal cell-counts aligned with data-row cell-counts.
- **Print stays client-side.** The builder is pure and returns a fragment;
  `window.print()` does the rest. Do not resurrect a server PDF path or touch the
  orphaned `@builders/pdf`.
- **Update the file-generation tests** for any change, especially
  `above-table-invariant.test.ts` for any style-block or top-grid edit (it pins the
  exact HTML) and `adjustments-*`/`print-config` for column/preset edits.
- **Drive, don't multiple-choice.** Make the sound call and surface open questions in
  your response; only ask when the answer changes the work (e.g. a customer-facing
  sign convention).
- **Explicit-only.** Trigger on the literal `/wo-print-file`. Not on "print the work
  order", "fix the WO file", "work order pdf".

## Step 1 — Read the stack end-to-end

Open the File-map files above for the layers the change touches — always the domain
renderer + `types.ts`; add the read-repository when a printed *value* changes, and
the configurator when a *toggle* changes. The code is the source of truth; do not
rely on memory of the layout.

## Step 2 — Classify the change

- **top-field** — add/move/relabel a Warehouse/Date/… value in the top block.
- **adjustment-column** — a Dyelot/Roll#/Adjustment/Location-style toggleable column.
- **material-column** — a Plan File (requested material) column.
- **layout / CSS** — colgroup widths, spacing, the style block, per-page frame.
- **data-projection** — surface a field that isn't in `WorkOrderFileGenerationInput`
  yet.

## Step 3 — Thread it through every layer the class touches

- **top-field:** key + label (`types.ts`) → gated cell in `renderWorkOrderInfo` →
  `WorkOrderFileGenerationInput` field + `read-repository.ts` projection.
- **column:** the visibility type (`types.ts`) → the configurator's field list +
  toggle → header + row + subtotal cells (keep counts aligned) → preset defaults in
  `print-presets.ts`.
- **layout/CSS:** edit `WO_PRINT_STYLE_BLOCK` or the colgroup in
  `work-order-document-sections.ts` only; nothing else moves.
- **data-projection:** extend `WorkOrderFileGenerationInput` + the read select/map;
  then render it.

## Step 4 — Update the tests

Adjust `packages/domain/tests/work-orders/file-generation/*` to match. Any top-grid
or style change → update the `above-table-invariant` expected HTML. Column/preset
change → `adjustments-*` + `print-config`. Add cases for new fields/columns.

## Step 5 — Verify

Run the file-generation tests (`npm run test -w @builders/domain -- work-orders/file-generation`)
and typecheck. When practical, load `/print/work-orders/<id>` and eyeball the preview.

## Step 6 — Report (per project CLAUDE.md)

Headline + a tight layer-grouped checklist of what changed + the test result. End
with the ≤17-word commit message. Do not commit.

```
WO-PRINT-FILE — <change class> — <one-line summary>

═══ Grounding ═══
Read: <files>   Change class: <top-field | column | layout | data-projection>

═══ Changed — by layer ═══
Domain    - <file> — <edit>
Data      - <file> — <edit>            (omit if untouched)
Module    - <file> — <edit>            (omit if untouched)
Tests     - <file> — <edit>

═══ Contract check ═══
- key ↔ cell ↔ data field all present: <yes/n a>   subtotal cell-count aligned: <yes/n a>

═══ Verify ═══
- file-generation tests: <pass/fail>   typecheck: <clean/errors>

═══ Open questions ═══
- <ambiguity / sign convention, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Resurrect a server PDF path or wire into the orphaned `@builders/pdf`.
- Add a real DB column — that's the `/column-*` skills (`/column-new-string`,
  `/column-new-index`, etc.); this skill only surfaces values that already exist on
  the read.
- Touch record-view engine chrome (steppers, panels) — defer to `/engine`.
- Author or edit other skills — that's `/newskill`.
- Execute the paused WO-print backlog without user sign-off:
  - **increase-adjustment sign convention** on the printed adjustments (memory
    `wo-print-increase-adjustments-pending`) — a customer-facing call, blocked on the
    company's decision.
  - **`area` adjustment column** (`wo-file-area-column-pending`).
  - the **"Remaining" quantity** value (`wo-adjustments-remaining-value-pending`) —
    note that one lives on the on-screen record grid, NOT this print file.
- Commit changes, or run migrations.
- Trigger on anything but the literal `/wo-print-file` invocation.
