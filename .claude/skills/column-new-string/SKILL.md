---
name: column-new-string
description: Master of adding a brand-new STRING column/field to a module end-to-end across the schema → domain → data → application → api → module-UI → client-save-payload → tests stack. Scope is narrow on purpose — one new plain `String? @db.VarChar(N)` column that is NOT a foreign key and NOT DB-generated. Invoke to add a free-text/code string field (e.g. work-orders.purchaseOrderNumber): deep-digs the target module by tracing an existing analogous string field, classifies the field's visibility (list vs detail, exported, on-file, editable), then drives the change through every layer. Knows the trap that bit us — the client save-payload builders that hand-enumerate fields silently drop a new optional field, invisible to typecheck. Stops at the column: indexing + search-bar wiring is /column-new-index; non-string types are the other column-new-* skills. Editing skill, not read-only. Explicit-only — invoke on /column-new-string.
---

# /column-new-string

`/column-new-string` makes you the owner of adding a **brand-new string column** to a module. The user invokes it with a free-form intent — "add a `purchaseOrderNumber` to work orders", "put a `reference` code on properties shown in the list and CSV". Your job: deep-dig the target module by tracing an existing analogous string field, classify the new field's visibility, and drive it through every layer it touches — including the one that silently swallows it.

This is an **editing** skill — it reads the module end-to-end, classifies, then makes the change across the stack. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`, which this skill's deep-dig step borrows from).

## Scope — exactly one kind of column

This skill owns **one new plain string column** and nothing else:

- **String only.** `String? @db.VarChar(N)` (nullable). Pick `N` — ~50 for codes/PO#s, mirror a sibling for free text. Other types (int, bool, enum, money, phone, date) are **out of scope** → the sibling `column-new-*` skills.
- **Not a foreign key.** No relation field, no `@relation`, no `*Id` join, no picker. A field that references another model is a relation/picker job, not this skill.
- **Not DB-generated.** No `@default(dbgenerated(...))`, no sequence, no `@updatedAt` — a value the user types, not one Postgres computes. A generated/sequence number is **/row-number**.
- **The column only.** No index, no search bar, no server-side filter query. Adding those for the new column is **/column-new-index** (the planned follow-on). This skill leaves the column searchable-later, not searchable-now.

## The model (what adding a string column IS)

A new string column is **one vertical slice repeated across the layers**, walking the canonical spine:

`schema (+ migration) → domain types/limits/normalizers/form-rules/export → data selects + write-repo input → application (verify pass-through) → api validators → module UI (list col + row-cell + record field + CSV) → client save-payload builders → tests`

The single best technique: **pick an existing analogous string field and trace it through every layer first.** It is your template — the new field mirrors it edit-for-edit. For a bounded free-text field, `internalNotes` on work-orders is the canonical analog (the trace this skill was built from). Match the analog's visibility as closely as possible.

### Classify the field's visibility before touching (this decides which layers get the edit)

Decide all four in Step 1 — they each gate specific layers:

1. **Size** — `String? @db.VarChar(N)`; pick `N` and add a `WO_*_MAX` constant in `column-limits.ts`, enforced at the API.
2. **List-visible vs detail-only** — **the most error-prone call.** A field shown in the **list** OR exported to **CSV** must thread the **list** path: `workOrderListSelect`, the `WorkOrderListInput` type + `normalizeWorkOrderListRow`, and `WorkOrderListRow`. A detail-only field (like `internalNotes`) touches only the **detail** select/type and is **excluded** from the list select. Getting this wrong means the column renders blank or fails to export. `WorkOrderDetail extends WorkOrderListRow`, so a list field is inherited by detail for free.
3. **Exported in CSV** — if yes, add an entry to the module's `export-columns.ts` manifest (and this forces list-visibility, per #2). No existing test guards this manifest — add one.
4. **On the printed file / PDF** — usually **no** for internal/operational fields. Confirm and leave `file-generation/` untouched; state it explicitly so the exclusion is intentional, not forgotten.

Editable-vs-read-only is a fifth call but for a typed string field it is almost always **editable** → it joins `WorkOrderForm` + `EMPTY_WORK_ORDER_FORM` + the `toWorkOrderForm` mapper + a record-view `TextCell`/`TextareaCell` bound to `draft.<field>` **and the client save-payload builders** (see the trap). A read-only string (sourced from detail, no form) is the exception — wire a `StaticFieldValue` cell and skip the form/payload layers.

### The save-payload trap (the bug this skill exists to prevent)

The front-end does **not** send the whole draft. The update path runs through a hand-written mapper — `apps/web/modules/work-orders/controllers/record/drafts.ts` `toUpdateWorkOrderInput` — that **enumerates every field by name** into the PATCH body. The create path re-enumerates again in `components/record/work-order-create-client.tsx`. A new **optional** field left out of either object literal is **silently dropped**: the UI shows it (the draft holds it locally), the section save returns 200 (other fields persist), and the API validator's `if ("<field>" in body)` gate never fires — so the column never reaches the DB. **Typecheck does not catch this**, because the field is optional on the input type. Every editable new field MUST be added to both builders, and a mapping test must guard it.

## Hard rules

- **String, non-FK, non-generated — or hand off.** If the column is any other type, a relation/foreign key, or DB-generated, stop and defer (see the negation section). This skill is deliberately narrow.
- **Deep-dig before you touch.** Do the Step 1 read every time: read the target module end-to-end and trace one existing analogous string field across every layer. The analog is the template; never write from this skill's spine alone. The code is the source of truth — memory and prior sessions drift.
- **Classify visibility first.** Size, list-vs-detail, exported, on-file. Each gates specific layers; guessing list-vs-detail wrong ships a blank column.
- **The save-payload builders are mandatory for an editable field.** `controllers/record/drafts.ts` `toUpdate*Input` **and** the `*-create-client.tsx` body both hand-enumerate fields and silently drop a new optional one — typecheck won't flag it. Add the field to both; add a mapping test.
- **List-visible ⇒ thread the list path.** A list column or CSV field needs the **list** select + list-input type + list normalizer + list-row type, not just the detail path. Detail-only fields stay out of the list select.
- **Leave indexing + search to /column-new-index.** Do NOT add an `@@index`, a GIN-trgm index, a search bar, or a server-side `where`/ILIKE filter for the new column. The column ships searchable-later; the index/search wiring is a separate skill and migration.
- **The user runs migrations — never the skill.** Author the SQL migration file alongside the schema edit (`ALTER TABLE "<table>" ADD COLUMN "<field>" VARCHAR(N);`, double-quoted identifiers, nullable, no backfill) per `author-migration-with-schema-edit`; `db:deploy` only applies pre-written files. Never run it.
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed as built `dist/`. After editing their types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck`/tests, or healthy code shows phantom "not exported" errors.
- **Verify application is really pass-through — don't assume.** Most use cases forward the input verbatim, but read the use case + its input-type alias to confirm before declaring "no change".
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; the schema change is its own commit.
- **Drive, don't multiple-choice.** Settle a genuine open question (varchar size, list-vs-detail, on-file?) by surfacing it in the response with a recommendation, then execute. Use a single question only when the answer changes the plan and you can't make a sound call.
- **Explicit-only.** Trigger on the literal `/column-new-string`. Not on "add a column", "new field idea", "can you add X to the table".

## Step 1 — Deep-dig the target module

Before proposing anything, read the current reality (this is a focused `/session-new`-style read):

1. **Confirm scope.** The field is a plain string, not an FK, not generated. If not, hand off.
2. **Pick the analog.** Choose the closest existing string field of the same visibility (free text → `internalNotes`/`description`; short code → a sibling VarChar). It is your edit-for-edit template.
3. **Trace the analog across every layer** — schema model, domain `types.ts`/`column-limits.ts`/`normalizers.ts`/`form-rules.ts`/`export-columns.ts`, data `shared.ts` selects + `write-repository.ts` input, application use-case input alias, api `_validators.ts`, module `list-columns.ts`/row-cell/record fields/CSV, and the client `drafts.ts` + `*-create-client.tsx` payload builders. Fan out with `Explore` agents when the module is large.
4. **Classify the new field's visibility** (the four calls above).
5. **Memory** — read `author-migration-with-schema-edit` (author the SQL file with the schema edit). Treat as context; verify against code.

State what you found in one tight block (target module, analog field, varchar size, list-vs-detail, exported?, on-file?, editable?) before proposing the change.

## Step 2 — Confirm the placement

Pin the exact insertion points from the analog trace:

- **List** — which column the new one sits left/right of (e.g. before `createdAt`), keyed by the backend field name.
- **Record view** — which cell it sits above/below and the cell type (`TextCell` for single-line, `TextareaCell` for multi-line, `StaticFieldValue` for read-only). "Above Internal Notes" means a **new full-width grid row** stacked above it, re-numbering the rows below.
- **CSV** — its slot in the export manifest (mirror the list order).
- Surface any genuinely ambiguous placement/size call in the response with a recommendation; don't stall.

## Step 3 — Execute the layer walk

Touch only the layers the visibility classification lit up:

1. **Schema + migration** — add `<field> String? @db.VarChar(N)` to the model in `packages/db/prisma/schema.prisma` (camelCase, no `@map` unless the table convention uses one; nullable). Author `packages/db/prisma/migrations/<ts>_<module>_<field>/migration.sql` — `ALTER TABLE "<table>" ADD COLUMN "<field>" VARCHAR(N);` with double-quoted identifiers, a `<ts>` later than the newest existing migration. **No index here.** Never run it.
2. **Domain** — `column-limits.ts` add `*_MAX` (re-exported via the barrel's `export *`); `types.ts` add the field to `WorkOrderListRow` (list-visible) and/or the `*Detail` type, plus `*Form` + `EMPTY_*_FORM` if editable; `normalizers.ts` add to the list `*Input` type + `normalize*ListRow` (`?? ""` — detail normalizer inherits via `...base`); `form-rules.ts` map it in `to*Form`; `export-columns.ts` add the manifest entry if exported.
3. **Data** — `shared.ts`: add `<field>: true` to the **detail** select always, and the **list** select if list-visible/exported. `write-repository.ts`: add `<field>?: string | null` to `Create*RecordInput` (`Update*Input = Partial<...>` inherits it; create/update pass `data: input` straight through).
4. **Application** — **read** the use case + its `*UseCaseInput` alias. If pass-through, no change — say so. If a use case transforms or allowlists fields, thread the new one.
5. **API** — `app/api/<module>/_validators.ts`: import the limit, add `<field>: optionalBoundedText(body.<field>, <MAX>, "<field>", fail)` to the create validator and the `if ("<field>" in body)` block in the update validator. Mirror the analog exactly.
6. **Module UI** — `list-columns.ts` insert `{ key, label }` at the placement; row-cell add a `case "<field>": return row.<field> || "-"`; record-view add the field cell at its placement bound to `draft.<field>` / `onFieldChange("<field>", …)` (editable) or `StaticFieldValue` from detail (read-only). Leave `file-generation/` untouched unless on-file.
7. **Client save-payload builders (editable only — the trap)** — add the field to `controllers/record/drafts.ts` `toUpdate*Input` **and** the `components/record/*-create-client.tsx` create body. Both hand-enumerate; missing either silently drops writes.
8. **Tests** — update the `normalize*ListRow` fixture (the list `*Input` type now requires the field, so the test won't typecheck until added) with a pass-through + null-default assertion; add an `export-columns` manifest test if exported; add a `to*Input` mapping test asserting the field carries (guards the trap). Improve sibling fixtures threaded by the field.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck` and tests. Don't typecheck before the dist rebuild.
- Run the full gauntlet (`/check-gauntlet`) for a cross-layer change, or at minimum the touched workspaces' tests + web typecheck.
- **Manually reason through the save path** — does the field reach the PATCH/POST body, the validator, and the DB? The trap passes typecheck, so eyeball `drafts.ts` + the create body. Recommend the user smoke-test: set the field → save → reopen → check the DB row.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; a table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-NEW-STRING — <module>.<field> — VarChar(<N>)   (visibility: list <yes/no> · csv <yes/no> · file <no> · editable <yes/no>)

═══ Grounding ═══
Target: <module>   Analog traced: <field>   Size: VarChar(<N>)   List-visible: <…>   Exported: <…>   Editable: <…>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + migration | schema.prisma · migrations/<ts>_<module>_<field> | ✅ authored (unrun), no index |
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

═══ Deferred ═══
Index + search bar for <field>: → /column-new-index

═══ Open questions ═══
- <varchar size / list-vs-detail / on-file, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Skip the deep-dig and write from the spine alone — it traces a real analog field across the live code every run.
- Add a non-string column — int/bool/enum/money/phone/date are the sibling **/column-new-*** skills (string is this skill).
- Add a foreign-key / relation field or a picker — that's a relation job, not this skill.
- Add a DB-generated / sequence column — that's **/row-number**.
- Add an `@@index`, a GIN-trgm index, a list search bar, or a server-side filter/ILIKE query for the new column — that's **/column-new-index**. This skill ships the column searchable-later, not searchable-now.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Add a `createdBy`/`updatedBy` actor pair → **/column-actor**; a `createdAt`/`updatedAt` pair or its display → **/column-timestamp**; a PaletteColor chip → **/column-color**; multi-column **sort** wiring → **/column-sort**.
- Forget the client save-payload builders — the whole reason it exists; an editable field missing from `drafts.ts`/`*-create-client.tsx` is silently dropped.
- Add the field to the printed file/PDF unless the user asks — operational columns stay off the slip.
- Reshape engine / list-view / record-view chrome, or the export mechanism itself — that's **/engine**.
- Plan or execute whole-module work or a broad multi-column sweep → **/session-new**; author another skill → **/newskill**.
- Commit, fold the schema into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-new-string` invocation.
