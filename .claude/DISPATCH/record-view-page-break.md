# record-view-page-break — add a vertical page-break/visible-divider primitive to the record-view engine and relayout the properties record view onto it

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/engine` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Add a VERTICAL page-break primitive (a column-balancer that also renders a visible divider line) INTO the record-view engine — build it in the engine, prove it on properties first. Then relayout the properties record view onto it: the entity picker/types/contact cells sit to the RIGHT of the vertical break, the editable property cells stay on the LEFT, and the footer band below the horizontal divider gets re-stacked (see layout map). The core problem it solves: today a tall cell on the right (e.g. the Address edit cell, the Instructions textarea) drags the vertical spacing of the left-column cells because they share grid rows. A vertical break decouples the two columns AND shows as a visible line. "Done" = the primitive is additive/opt-in in the engine barrel, the properties view renders with no cell ever crossing the vertical break, the two raw inline `<div className="border-t …" />` dividers are gone, and `/check` is green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Is the horizontal divider ALSO a page break, or a separate primitive?** The vertical break is a *column-balancer* (stops tall right cells dragging left-cell spacing) that shows as a line. The horizontal divider at `property-record-view.tsx:177` and `:185` is a *section terminator* with a full-width footer band (Created/Updated `at` + actor `by`) below it. These are arguably two different primitives. The leaning (NOT decided — settle with the user): the vertical break TERMINATES at the horizontal divider, and the footer band below the divider is full-width, so nothing crosses a vertical break that no longer exists below the divider. Decide whether you ship ONE primitive with both orientations or TWO (vertical break + horizontal divider). Either way the horizontal divider must replace the two raw inline `<div>`s currently used.
- ⚑ **Can cells cross the vertical break BELOW the horizontal divider?** Per the leaning above the break ends at the divider so the question is moot — but it is explicitly open. Confirm the footer band (Created/Updated/by) is full-width and crosses nothing, vs. the break continuing down through the footer.
- ⚑ **Primitive's home in the engine: `layout-grid/` vs `fields/`.** It is a grid-coordinate concern (it lives between/around `CellAt` placements and must respect the 8-column `FIELD_SECTION_COLUMNS` grid), which argues for `layout-grid/`. But it is a visual divider like `FieldSection`/`FormField`, which argues for `fields/`. Decide during `/engine`; mirror the chosen folder's barrel + `index.ts` export convention.
- ⚑ **Mechanism: how does the break actually decouple the two columns?** A single `FieldSection` (one 8-col `LayoutGrid`) puts left and right cells in shared grid rows, which is exactly why tall right cells drag the left. Options to weigh: (a) place left + right cells in TWO independent sub-grids/columns flanking a vertical rule (cleanest decoupling), or (b) a `CellAt`-placed full-height vertical-rule cell within one grid (keeps single-grid but rows are still shared → may NOT actually fix the drag). Validate which truly decouples before building. The primitive likely needs to OWN the two-column split, not just draw a line.
- ⚑ **Divider tone.** Canonical divider color is `var(--panel-border)` (used by the two raw inline dividers being replaced and ~everywhere in `cells/`). An accent-toned divider precedent exists at `grid/expandable-rows/expandable-row.tsx:181-219` via `@/engines/common`'s `accent-styles`. Default to `var(--panel-border)` unless the user wants accent toning.
- ⚑ **Where do the right-column cells live after relayout?** Today the entity picker + types + read-only Phone/Email/Address are their own `EntityPickerSection` and the editable property cells are their own `PropertyFieldsSection`, stacked vertically with a raw divider between (`property-record-view.tsx:159-185`). The relayout puts entity cells to the RIGHT and property cells to the LEFT — so the two sections must now be composed side-by-side around the new primitive rather than stacked. Decide whether the primitive composes both sections, or `property-record-view.tsx` arranges them around it. NOTE: `PropertyFieldsSection` is ALSO consumed by the management-hub create form (per its docstring + the shared `composites/property-fields`) — do NOT change its internal column layout in a way that breaks the hub; keep the relayout in the record-view composition, not inside the shared section.
- ⚑ **Footer-band re-stack details.** Target footer layout (from intent): move **Property #** to BELOW the Instructions cell; then stack **Created**/**Updated** (`at`) and to their RIGHT the **Created by**/**Updated by** (`by`) cells. Today all six are one flat `flex gap-6` row at `:186-202`. Confirm the exact 2×2 (`at` left column, `by` right column) + Property# placement with the user, and whether Property# moves into the left property-cell column (below Instructions) vs. into the footer band.

## Scope
In:
- Create a vertical page-break / visible-divider primitive in `apps/web/engines/record-view/` and export it from the engine barrel (`index.ts`). Additive/opt-in — existing record views that don't adopt it must be byte-for-byte unchanged.
- Replace the TWO raw inline `<div className="border-t border-[var(--panel-border)]" />` dividers in the properties record view with the engine primitive.
- Relayout the properties record view: entity cells to the RIGHT of the vertical break, editable property cells on the LEFT, footer band re-stacked (Property# below Instructions; `at` cells stacked with `by` cells to their right) below the horizontal divider, with no cell ever crossing the vertical break.

Out:
- NO schema change, NO migration — this is pure UI/engine work.
- Do not touch the list-view engine, the work-orders / inventory / payments modules, or `packages/**`.
- Do not change the internal column layout of the shared `PropertyFieldsSection` / `composites/property-fields` in a way that alters its other consumer (the management-hub create form) — keep the relayout in the record-view composition.
- The properties templates section (`components/record/templates/property-templates-section.tsx`) is untouched.

## Files you own (do not edit anything outside this list)
- `apps/web/engines/record-view/**` — add the new vertical page-break / visible-divider primitive (home: `layout-grid/` or `fields/` — see Flag) and export it from `apps/web/engines/record-view/index.ts` via the chosen sub-barrel. The barrel already re-exports `./layout-grid` and `./fields` (`index.ts:10-11`), so adding the primitive to either sub-`index.ts` surfaces it automatically.
- `apps/web/modules/properties/components/record/property-record-view.tsx` — MAIN relayout target; replace the two raw dividers (`:177`, `:185`), recompose entity/property cells around the vertical break, re-stack the footer band (`:186-202`).
- `apps/web/modules/properties/components/record/primary/entity-picker-section.tsx` — the RIGHT-side cells (entity picker col1 span5, types col6 span3, read-only Phone/Email/Address). May need its `CellAt` placements / wrapping adjusted to live on the right of the break.
- `apps/web/modules/properties/components/record/primary/property-fields-section.tsx` — the LEFT-side editable cells (Name/Phone/Email/Address/Instructions, one-per-row col1 span5). CAUTION: shared with the management-hub create form — see Flag; prefer composing it on the left rather than editing its internals.
- `apps/web/modules/properties/components/record/property-detail-client.tsx` — SSR wrapper; likely untouched but yours if the composition needs it.
- `apps/web/modules/properties/controllers/record/use-property-primary-section.ts` — data/section controller (`useSingleSectionRecordController`); has NO layout role. Almost certainly untouched, but yours.

## Layer-by-layer map
(real path:line)

Engine — `apps/web/engines/record-view/`
- New primitive home options:
  - `layout-grid/` — sits with `CellAt` (`layout-grid/cell-at.tsx`) + `LayoutGrid` (`layout-grid/layout-grid.tsx`) on the 8-column grid contract (`layout-grid/contracts/layout-grid-geometry.ts`: `FIELD_SECTION_COLUMNS = 8`). Add `page-break.tsx` (or similar) + export via `layout-grid/index.ts:1-3`.
  - `fields/` — sits with `FieldSection` (`fields/field-section.tsx`) + `FormField` (`fields/form-field.tsx`). Export via `fields/index.ts:1-5`.
- Engine barrel `apps/web/engines/record-view/index.ts:10-11` already spreads `./fields` and `./layout-grid` — no edit there if you add to a sub-barrel.
- Divider color: `var(--panel-border)` is canonical (matches the two raw dividers being replaced; used throughout `cells/`). Accent-toned precedent (NOT default): `grid/expandable-rows/expandable-row.tsx:181-219` using `ACCENT_BORDER_CLASS_NAME` from `@/engines/common`.
- Mechanism reference: `FieldSection` renders ONE `LayoutGrid` (`field-section.tsx:23-37`) with `columns: 8`, `rows: "auto"`, invisible chrome; `CellAt` places via `gridColumn`/`gridRow` (`cell-at.tsx:34-37`). Shared rows are the root cause of the left/right drag — the primitive must genuinely decouple the columns (see mechanism Flag), not merely draw a line.

Module dir — `apps/web/modules/properties/components/record/`
- `property-record-view.tsx`:
  - `:159` opens the `<div className="flex flex-col gap-4">` that stacks the two sections + dividers.
  - `:160-176` `<EntityPickerSection … />` (becomes RIGHT-of-break).
  - `:177` raw divider `<div className="border-t border-[var(--panel-border)]" />` → replace with engine primitive.
  - `:178-184` `<PropertyFieldsSection … />` (becomes LEFT-of-break).
  - `:185` second raw divider → replace with engine primitive (the horizontal divider/section terminator — see Flag).
  - `:186-202` the flat `<div className="flex gap-6">` footer with 6 `FormField`+`StaticFieldValue` cells (Property # `:187`, Created `:190`, Updated `:193`, Created by `:196`, Updated by `:199`) → re-stack per the footer Flag.
- `primary/entity-picker-section.tsx:59-117` — `FieldSection gap="0.75rem"` with `CellAt col1 span5` (Entity picker + `RecordOpenButton`/`EntityCreateMenu` actions), `CellAt col6 span3` (Types via `EntityTypesArrayPicker`, read-only), `CellAt col1 span5` Phone, Email, and `AddressEditCell colSpan={5}` — all read-only display cells.
- `primary/property-fields-section.tsx:49-111` — `FieldSection gap="0.75rem"` with Name (col1 span5, required), optional Phone/Email (`showContact`), `AddressEditCell colSpan={5}`, Instructions (`TextareaCell rows={3}`). Shared with the hub create form via the `showContact` prop and `composites/property-fields` — treat its internals as frozen for the hub.
- `property-detail-client.tsx:10-35` — SSR scaffold wrapper (`RecordDetailClientScaffold`, `headerVariant="section"`). Likely no change.
- `controllers/record/use-property-primary-section.ts:22-66` — `useSingleSectionRecordController`, data only, no layout. No change expected.

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
