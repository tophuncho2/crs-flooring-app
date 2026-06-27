---
name: column-new
description: Master of adding a brand-new plain column/field to a module end-to-end across the schema → domain → data → application → api → module-UI → client-save-payload → tests stack — the generic installer the rest of the column-* family specializes under. Invoke to add a new scalar/free-text field (string, int, bool, enum, money, phone) to a module: deep-digs the target module by tracing an existing analogous field, classifies the field's visibility (list vs detail, exported, on-file, editable), then drives the change through every layer. Knows the trap that bit us — the client save-payload builders that hand-enumerate fields silently drop a new optional field, invisible to typecheck. Editing skill, not read-only. Explicit-only — invoke on /column-new.
---

# /column-new

`/column-new` makes you the owner of adding a **brand-new plain column** to a module. The user invokes it with a free-form intent — "add a `purchaseOrderNumber` to work orders", "put a `reference` field on properties shown in the list and CSV", "add a numeric `priority` to inventory". Your job: deep-dig the target module by tracing an existing analogous field, classify the new field's visibility, and drive it through every layer it touches — including the one that silently swallows it.

This is an **editing** skill — it reads the module end-to-end, classifies, then makes the change across the stack. It is not a read-only audit (that's `/report`/`/dig`) and not a whole-module plan (that's `/newsession`, which this skill's deep-dig step borrows from).

## The model (what adding a column IS)

A new column is **one vertical slice repeated across the layers**, walking the canonical spine:

`schema (+ migration) → domain types/limits/normalizers/form-rules/export → data selects + write-repo input → application (verify pass-through) → api validators → module UI (list col + row-cell + record field + CSV) → client save-payload builders → tests`

The single best technique: **pick an existing analogous field and trace it through every layer first.** It is your template — the new field mirrors it edit-for-edit. For a bounded free-text field, `internalNotes` on work-orders is the canonical analog (the trace this skill was built from). Match the analog's data type and visibility as closely as possible.

### Classify the field's visibility before touching (this decides which layers get the edit)

Decide all five in Step 1 — they each gate specific layers:

1. **Data type + size** — `String? @db.VarChar(N)` (pick N; ~50 for codes/PO#s, mirror a sibling for free text), `Int?`, `Boolean`, an enum, money (`Decimal(12,2)` → **/column-color**'s sibling `money-standard`), phone (`phone-standard`). For bounded text, add a `WO_*_MAX` constant in `column-limits.ts` and enforce it at the API.
2. **List-visible vs detail-only** — **the most error-prone call.** A field shown in the **list** OR exported to **CSV** must thread the **list** path: `workOrderListSelect`, the `WorkOrderListInput` type + `normalizeWorkOrderListRow`, and `WorkOrderListRow`. A detail-only field (like `internalNotes`) touches only the **detail** select/type and is **excluded** from the list select. Getting this wrong means the column renders blank or fails to export. `WorkOrderDetail extends WorkOrderListRow`, so a list field is inherited by detail for free.
3. **Exported in CSV** — if yes, add an entry to the module's `export-columns.ts` manifest (and this forces list-visibility, per #2). No existing test guards this manifest — add one.
4. **On the printed file / PDF** — usually **no** for internal/operational fields. Confirm and leave `file-generation/` untouched; state it explicitly so the exclusion is intentional, not forgotten.
5. **Editable in the form vs read-only** — editable → it joins `WorkOrderForm` + `EMPTY_WORK_ORDER_FORM` + the `toWorkOrderForm` mapper + a record-view `TextCell`/input bound to `draft.<field>` **and the client save-payload builders** (see the trap below). Read-only → a `StaticFieldValue` cell sourced from detail, no form/payload wiring.

### The save-payload trap (the bug this skill exists to prevent)

The front-end does **not** send the whole draft. The update path runs through a hand-written mapper — `apps/web/modules/work-orders/controllers/record/drafts.ts` `toUpdateWorkOrderInput` — that **enumerates every field by name** into the PATCH body. The create path re-enumerates again in `components/record/work-order-create-client.tsx`. A new **optional** field left out of either object literal is **silently dropped**: the UI shows it (the draft holds it locally), the section save returns 200 (other fields persist), and the API validator's `if ("<field>" in body)` gate never fires — so the column never reaches the DB. **Typecheck does not catch this**, because the field is optional on the input type. Every editable new field MUST be added to both builders, and a mapping test must guard it.

## Hard rules

- **Deep-dig before you touch.** Do the Step 1 read every time: read the target module end-to-end and trace one existing analogous field across every layer. The analog is the template; never write from this skill's spine alone. The code is the source of truth — memory and prior sessions drift.
- **Classify visibility first.** Data type/size, list-vs-detail, exported, on-file, editable-vs-read-only. Each gates specific layers; guessing list-vs-detail wrong ships a blank column.
- **The save-payload builders are mandatory for an editable field.** `controllers/record/drafts.ts` `toUpdate*Input` **and** the `*-create-client.tsx` body both hand-enumerate fields and silently drop a new optional one — typecheck won't flag it. Add the field to both; add a mapping test.
- **List-visible ⇒ thread the list path.** A list column or CSV field needs the **list** select + list-input type + list normalizer + list-row type, not just the detail path. Detail-only fields stay out of the list select.
- **The user runs migrations — never the skill.** Author the SQL migration file alongside the schema edit (double-quoted identifiers, nullable, the right type, no backfill) per `author-migration-with-schema-edit`; `db:deploy` only applies pre-written files. Never run it.
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed as built `dist/`. After editing their types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck`/tests, or healthy code shows phantom "not exported" errors.
- **Verify application is really pass-through — don't assume.** Most use cases forward the input verbatim, but read the use case + its input-type alias to confirm before declaring "no change".
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; the schema change is its own commit.
- **Drive, don't multiple-choice.** Settle a genuine open question (varchar size, list-vs-detail, on-file?) by surfacing it in the response with a recommendation, then execute. Use a single question only when the answer changes the plan and you can't make a sound call.
- **Defer specialized columns.** If the field is an archetype with its own skill — actor pair, palette color, record-#, timestamp pair, or sort wiring — hand off (see the negation section). This skill owns the **generic** scalar/free-text column.
- **Explicit-only.** Trigger on the literal `/column-new`. Not on "add a column", "new field idea", "can you add X to the table".

## Step 1 — Deep-dig the target module

Before proposing anything, read the current reality (this is a focused `/newsession`-style read):

1. **Pick the analog.** Choose the closest existing field of the same type + visibility (free text → `internalNotes`/`description`; bounded code → a `*NumberInt` neighbor; enum → an existing enum field). It is your edit-for-edit template.
2. **Trace the analog across every layer** — schema model, domain `types.ts`/`column-limits.ts`/`normalizers.ts`/`form-rules.ts`/`export-columns.ts`, data `shared.ts` selects + `write-repository.ts` input, application use-case input alias, api `_validators.ts`, module `list-columns.ts`/row-cell/record fields/CSV, and the client `drafts.ts` + `*-create-client.tsx` payload builders. Fan out with `Explore` agents when the module is large.
3. **Classify the new field's visibility** (the five calls above).
4. **Memory** — read `author-migration-with-schema-edit` (author the SQL file with the schema edit); for typed columns check the relevant standard (`money-standard`, `phone-standard`, `exact-number-search standard`). Treat as context; verify against code.

State what you found in one tight block (target module, analog field, data type + size, list-vs-detail, exported?, on-file?, editable?) before proposing the change.

## Step 2 — Confirm the placement

Pin the exact insertion points from the analog trace:

- **List** — which column the new one sits left/right of (e.g. before `createdAt`), keyed by the backend field name.
- **Record view** — which cell it sits above/below and the cell type (`TextCell`, `TextareaCell`, `DateCell`, `SegmentedChoiceCell`, `StaticFieldValue`). "Above Internal Notes" means a **new full-width grid row** stacked above it, re-numbering the rows below.
- **CSV** — its slot in the export manifest (mirror the list order).
- Surface any genuinely ambiguous placement/size call in the response with a recommendation; don't stall.

## Step 3 — Execute the layer walk

Touch only the layers the visibility classification lit up:

1. **Schema + migration** — add the column to the model in `packages/db/prisma/schema.prisma` (camelCase, no `@map` unless the table convention uses one; nullable). Author `packages/db/prisma/migrations/<ts>_<module>_<field>/migration.sql` — `ALTER TABLE "<table>" ADD COLUMN "<field>" <TYPE>;` with double-quoted identifiers, a `<ts>` later than the newest existing migration. Never run it.
2. **Domain** — `column-limits.ts` (bounded text → `*_MAX`, re-exported via the barrel's `export *`); `types.ts` add the field to `WorkOrderListRow` (list-visible) and/or the `*Detail` type, plus `*Form` + `EMPTY_*_FORM` if editable; `normalizers.ts` add to the list `*Input` type + `normalize*ListRow` (`?? ""` for nullable string — detail normalizer inherits via `...base`); `form-rules.ts` map it in `to*Form`; `export-columns.ts` add the manifest entry if exported.
3. **Data** — `shared.ts`: add `<field>: true` to the **detail** select always, and the **list** select if list-visible/exported. `write-repository.ts`: add `<field>?: <type> | null` to `Create*RecordInput` (`Update*Input = Partial<...>` inherits it; create/update pass `data: input` straight through).
4. **Application** — **read** the use case + its `*UseCaseInput` alias. If they're pass-through aliases forwarding `input` verbatim, no change — say so. If a use case transforms or allowlists fields, thread the new one.
5. **API** — `app/api/<module>/_validators.ts`: import the limit, add the field to the create validator (`optionalBoundedText(body.<field>, <MAX>, "<field>", fail)` for bounded text; the type-appropriate parser otherwise) and the `if ("<field>" in body)` block in the update validator. Mirror the analog exactly.
6. **Module UI** — `list-columns.ts` insert `{ key, label }` at the placement; row-cell add a `case "<field>": return row.<field> || "-"`; record-view add the field cell at its placement bound to `draft.<field>` / `onFieldChange("<field>", …)` (editable) or `StaticFieldValue` from detail (read-only). Leave `file-generation/` untouched unless on-file.
7. **Client save-payload builders (editable only — the trap)** — add the field to `controllers/record/drafts.ts` `toUpdate*Input` **and** the `components/record/*-create-client.tsx` create body. Both hand-enumerate; missing either silently drops writes.
8. **Tests** — update the `normalize*ListRow` fixture (the list `*Input` type now requires the field, so the test won't typecheck until added) with a pass-through + null-default assertion; add an `export-columns` manifest test if exported; add a `to*Input` mapping test asserting the field carries (guards the trap). Improve sibling fixtures threaded by the field.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck` and tests. Don't typecheck before the dist rebuild.
- Run the full gauntlet (`/check`) for a cross-layer change, or at minimum the touched workspaces' tests + web typecheck.
- **Manually reason through the save path** — does the field reach the PATCH/POST body, the validator, and the DB? The trap passes typecheck, so eyeball `drafts.ts` + the create body. Recommend the user smoke-test: set the field → save → reopen → check the DB row.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; a table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-NEW — <module>.<field> — <type, size>   (visibility: list <yes/no> · csv <yes/no> · file <no> · editable <yes/no>)

═══ Grounding ═══
Target: <module>   Analog traced: <field>   Type: <…>   List-visible: <…>   Exported: <…>   Editable: <…>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + migration | schema.prisma · migrations/<ts>_<module>_<field> | ✅ authored (unrun) |
| Domain | domain/src/.../{column-limits,types,normalizers,form-rules,export-columns}.ts | ✅ |
| Data | db/src/.../{shared,write-repository}.ts | ✅ list+detail selects |
| Application | application/src/.../{create,update}-*.ts | ✅ pass-through (verified) |
| API | app/api/<module>/_validators.ts | ✅ create + update |
| Module UI | modules/<module>/.../{list-columns,row-cell,record field} | ✅ |
| Save payload | controllers/record/drafts.ts · *-create-client.tsx | ✅ both builders (the trap) |
| Tests | normalizers + export-columns + drafts mapping | ✅ |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
Save-path reasoned end-to-end (field reaches DB): <yes>

═══ Open questions ═══
- <varchar size / list-vs-detail / on-file, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Skip the deep-dig and write from the spine alone — it traces a real analog field across the live code every run.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Add a `createdBy`/`updatedBy` actor pair → **/column-actor**; a `createdAt`/`updatedAt` timestamp pair or its Eastern-time display → **/column-timestamp**; a PaletteColor chip → **/column-color**; a record-# sequence/stepper/exact-search → **/column-rownumber**; multi-column **sort** wiring for an existing field → **/column-sort**. This skill owns the generic scalar/free-text column; defer the archetypes.
- Forget the client save-payload builders — the whole reason it exists; an editable field missing from `drafts.ts`/`*-create-client.tsx` is silently dropped.
- Add a field to the list select/type when it's detail-only, or omit it when it's list-visible/exported.
- Add the field to the printed file/PDF unless the user asks — operational columns stay off the slip.
- Reshape engine / list-view / record-view chrome, or the export mechanism itself — that's **/engine**.
- Plan or execute whole-module work or a broad multi-column sweep → **/newsession**; author another skill → **/newskill**.
- Commit, fold the schema into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-new` invocation.
