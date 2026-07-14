---
name: column-new-currency
description: Master of adding a brand-new MONEY column/field to a module end-to-end across the schema → domain → data → api → module-UI → client-save-payload → tests stack. Scope is narrow on purpose — one new nullable `Decimal? @db.Decimal(12,2)` currency column that is NOT a foreign key and NOT DB-generated. Invoke to add a money field (e.g. templates.plannedProducts.cost): deep-digs the target module by tracing an existing analogous money field, classifies the field's visibility + downstream propagation, then drives it through every layer via the money standard (normalizeMoneyAmount/isValidMoneyAmount + MoneyCell). Knows the two traps that bite — normalize-on-READ (Decimal.toString() drops trailing zeros → falsely-dirty rows) and the hand-enumerated client save-payload builders that silently drop a new optional field. Stops at the column: indexing/search is /column-new-index; other types are the sibling column-new-* skills. Editing skill, not read-only. Explicit-only — invoke on /column-new-currency.
---

# /column-new-currency

`/column-new-currency` makes you the owner of adding a **brand-new money column** to a module. The user invokes it with a free-form intent — "add a `cost` to planned products", "put a `deposit` amount on work orders". Your job: deep-dig the target module by tracing an existing analogous money field, classify the new field's visibility + downstream propagation, and drive it through every layer it touches — via the **money standard**, and through the two traps that pass typecheck but break at runtime.

This is an **editing** skill — it reads the module end-to-end, classifies, then makes the change across the stack. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`, which this skill's deep-dig step borrows from). It is the **money sibling of `/column-new-string`** — same spine, different type, plus the money-read trap that string doesn't have.

**Live reference build:** the PART 1 diff that added `TemplatePlannedProduct.cost` (2026-07-08) is this skill's edit-for-edit template — trace it whenever the abstract steps get thin. See the memory entry `templates-invoicing-epic` (the DIRECTION REVERSAL 2026-07-08 checkpoint).

## Scope — exactly one kind of column

This skill owns **one new money column** and nothing else:

- **Money only.** `Decimal? @db.Decimal(12,2)` (nullable). Always `(12,2)` — the money standard's `MONEY_PRECISION`/`MONEY_SCALE` (`packages/domain/src/shared/money.ts`). Other types (string, int, bool, enum, phone, date) are **out of scope** → the sibling `column-new-*` skills (string is **/column-new-string**).
- **Not a foreign key.** No relation field, no `@relation`, no `*Id` join, no picker. A field that references another model is a relation/picker job, not this skill.
- **Not DB-generated.** No `@default(dbgenerated(...))`, no sequence, no `@updatedAt` — a value the user types, not one Postgres computes. A generated/sequence number is **/row-number**.
- **The column only.** No index, no search bar, no server-side filter query. Adding those is **/column-new-index**. This skill ships the column searchable-later, not searchable-now.

## The model (what adding a money column IS)

A new money column is **one vertical slice repeated across the layers**, walking the canonical spine, with the money standard applied at every boundary:

`schema (+ migration) → domain types/rules/normalizers → data selects + write-repo input → application (verify pass-through / propagation) → api validators → module UI (MoneyCell + hand-enumerated controller sweep) → client save-payload builders → tests`

The single best technique: **pick an existing analogous money field and trace it through every layer first.** It is your template — the new field mirrors it edit-for-edit. `TemplatePlannedProduct.cost` is the canonical analog (the trace this skill was built from). Match the analog's visibility as closely as possible.

### The money standard (non-negotiable — this is what makes it a *money* column, not a string one)

Every money value is a **canonical fixed-scale-2 string** (`"10.00"`), never a JS float. `packages/domain/src/shared/money.ts` is the single source of truth:

- `isValidMoneyAmount(s)` — non-negative, ≤2 decimals, ≤10 integer digits. **Empty string is NOT valid** — callers treat blank as "absent" upstream. **`0` IS valid** (unlike quantity's `> 0`).
- `normalizeMoneyAmount(s)` — canonicalizes to `"X.XX"` (`"10"` → `"10.00"`), rounds half-up via BigInt, blank/garbage → `""`.
- UI cell is `MoneyCell` from `@/engines/record-view`.

### Classify the field before touching (this decides which layers get the edit)

Decide all five in Step 1 — they each gate specific layers:

1. **List-visible vs detail-only** — a field shown in the **list** OR exported to **CSV** must thread the **list** path (list select + list-input type + list normalizer + list-row type). A detail-only field (like `cost` on the planned-products section) touches only the **detail** select/type and stays out of the list select. Getting this wrong ships a blank column.
2. **Exported in CSV** — if yes, add the manifest entry in `export-columns.ts` (and this forces list-visibility, per #1). Add a test — no existing test guards the manifest.
3. **On the printed file / PDF** — usually **no** for internal cost fields; confirm and leave `file-generation/` untouched, stating the exclusion so it's intentional. If yes → **/wo-print-file**.
4. **Editable** — almost always yes for a typed money field → it joins the `*Form` + `EMPTY_*_FORM`, the `validate*Form` money check, the record-view `MoneyCell`, **and** the client save-payload builders (see the trap). A read-only computed money value (a total) is a different animal — it's derived at read, has no form, and is out of this skill's "user types it" scope.
5. **Downstream propagation** — **the money-specific call.** Does this amount flow into a mirror/sync/snapshot elsewhere (template→WO sync, an outbox payload, a printed total)? PART 1 deliberately **excluded** `cost` from `sync-template-to-work-order.ts` (that mapper enumerates fields explicitly and carries a `do not add cost here` comment). Decide propagation on purpose; a money value silently riding a spread into a downstream table is a bug waiting to happen.

### THE MONEY-READ TRAP (call it out loudly — the load-bearing reason the normalizer exists)

`MoneyCell` pads local state to `"10.00"` on blur, but Prisma's `Decimal.toString()` **drops trailing zeros** → `"10"`. Without **normalize-on-read**, every saved row reads back as `"10"` while local state holds `"10.00"`, so the section controller's `itemsDiffer` / revision-key flags **every saved row as still-dirty** — a phantom unsaved-changes state on a record the user never touched.

The fix is one line in the domain `normalizers.ts`, applied when mapping the Prisma row → record row:

```ts
cost: item.cost == null ? "" : normalizeMoneyAmount(item.cost.toString()),
```

`null` → `""`; everything else canonicalizes. This boundary is **mandatory** for an editable money column. (A string column has no analog — this trap is unique to money.)

### The save-payload trap (shared with /column-new-string)

The front-end does **not** send the whole draft — it runs through hand-written enumerators, and a new **optional** field left out is **silently dropped** (the UI shows it, the save returns 200, the API `in`-gate never fires, the column never reaches the DB — and **typecheck does not catch it**, because the field is optional). There are two module shapes; identify which the target uses:

- **Diff-based child section** (the `cost` reference build — planned-products): the enumeration lives in **one section controller**, `controllers/record/<section>/use-<module>-<section>-section.ts`, across **six** spots — the `*Local` type, `toLocalItem`, `itemsDiffer`, `createItemsRevisionKey` (the `${...}` join string), `toDiffForm`, and the blank-row `addItem` default. Miss any and the field is dropped or falsely-dirty.
- **Top-level record draft** (work-orders shape): the enumeration lives in `controllers/record/drafts.ts` `toUpdate*Input` **and** the `components/record/*-create-client.tsx` create body. Add to both.

### The tests trap (money-specific runtime bite)

Form fixtures in the domain tests are often `as never`-cast or spread from a base `form` object — a new field missing there **passes typecheck** but throws at **runtime** on `input.<field>.trim()` inside `validate*Form` (the money check calls `.trim()` on the field). Add the field to every form fixture (`{ ...form, cost: "…" }`), and add the two money-specific assertions the reference build has: **blank cost is valid** (unset) and **`0` cost is valid** (unlike quantity).

## Hard rules

- **Money, non-FK, non-generated — or hand off.** Any other type, a relation/foreign key, or DB-generated → stop and defer (see the negation section). This skill is deliberately narrow.
- **Deep-dig before you touch.** Read the target module end-to-end and trace one existing analogous money field across every layer. The analog is the template; never write from this skill's spine alone. The code is the source of truth — memory and prior sessions drift.
- **Apply the money standard at every boundary.** `Decimal? @db.Decimal(12,2)` in schema; `normalizeMoneyAmount` at the data write + api validator + normalize-on-read; `isValidMoneyAmount` in the form rule (blank OK, **0 allowed**); `MoneyCell` in the UI. Never a float, never `toFixed`.
- **Normalize on READ is mandatory (the money trap).** Add `x == null ? "" : normalizeMoneyAmount(x.toString())` to the domain normalizer for every editable money column, or saved rows read falsely-dirty.
- **Add the field to EVERY select that feeds the row.** The module's own read-repo select **and** every aggregate/parent detail projection. The reference build needed it in **three** selects — the module read-repo, the parent detail select, and the parent write-repo post-write projection. Miss one and the field reads blank on that path.
- **The save-payload builders are mandatory for an editable field.** Identify the module shape (diff-section controller vs top-level `drafts.ts` + `*-create-client.tsx`) and add the field to every hand-enumerated spot; typecheck won't flag a missing optional field.
- **Decide downstream propagation on purpose.** Confirm whether the amount flows into a sync/mirror/outbox/print. The `sync-template-to-work-order` mapper enumerates fields explicitly and deliberately excludes `cost` — match that intent, don't let a money value silently ride a spread.
- **Leave indexing + search to /column-new-index.** No `@@index`, no search bar, no server-side `where` filter for the new column.
- **The user runs migrations — never the skill.** Author the SQL file alongside the schema edit (`ALTER TABLE "<table>" ADD COLUMN "<field>" DECIMAL(12,2);`, double-quoted identifiers, nullable, no backfill) per `author-migration-with-schema-edit`; `db:deploy` only applies pre-written files. Never run it. (dev-1 shares the dev DB with sibling sub-branches — a "UNRUN" migration may already be applied; verify via migrate status per `never-edit-applied-migration`.)
- **dist-rebuild order before typecheck.** After editing `@builders/domain`/`@builders/db` types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck`/tests, or healthy code shows phantom "not exported" errors.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; the schema change is its own commit.
- **Drive, don't multiple-choice.** Settle genuine open questions (list-vs-detail, propagation, on-file?) by surfacing them in the response with a recommendation, then execute.
- **Explicit-only.** Trigger on the literal `/column-new-currency`. Not on "add a money field", "new cost column idea", "can you add a price to X".

## Step 1 — Deep-dig the target module

Before proposing anything, read the current reality (a focused `/session-new`-style read):

1. **Confirm scope.** The field is a money amount, not an FK, not generated. If not, hand off.
2. **Pick the analog.** Choose the closest existing money field of the same visibility — `TemplatePlannedProduct.cost` for a per-row editable money column on a diff section; a top-level money field for a record-draft module. It is your edit-for-edit template.
3. **Trace the analog across every layer** — schema model; domain `types.ts`/`rules.ts`/`normalizers.ts` (+ `export-columns.ts` if exported); data the module read-repo select + **every parent projection** + `write-repository.ts` `toMoney` helper + input; application use-case input alias **and any sync/mirror mapper**; api `_validators.ts` (`optionalMoney`); module `list-columns.ts`/row-cell/record `MoneyCell` + the hand-enumerated controller sweep; tests. Fan out with `Explore` agents when the module is large.
4. **Classify the field** (the five calls above — including propagation).
5. **Memory** — read `money-standard`, `author-migration-with-schema-edit`, `never-edit-applied-migration`, and `templates-invoicing-epic` (the reference build). Treat as context; verify against code.

State what you found in one tight block (target module, analog field, list-vs-detail, exported?, on-file?, editable?, propagation?) before proposing the change.

## Step 2 — Confirm the placement

Pin the exact insertion points from the analog trace:

- **Record view** — which cell/column the `MoneyCell` sits next to and its `align: "end"` (money is right-aligned, mirroring `cost` between Unit/Quantity in the grid).
- **List** *(if list-visible)* — which column it sits left/right of, keyed by the backend field name.
- **CSV** *(if exported)* — its slot in the export manifest (mirror the list order).
- Surface any genuinely ambiguous placement/propagation call in the response with a recommendation; don't stall.

## Step 3 — Execute the layer walk

Touch only the layers the classification lit up:

1. **Schema + migration** — add `<field> Decimal? @db.Decimal(12,2)` to the model in `packages/db/prisma/schema.prisma` (camelCase, nullable). Author `packages/db/prisma/migrations/<ts>_<table>_<field>/migration.sql` — `ALTER TABLE "<table>" ADD COLUMN "<field>" DECIMAL(12,2);`, double-quoted identifiers, a `<ts>` later than the newest existing migration. **No index.** Never run it. (Reference: `20260708130000_add_template_planned_product_cost`.)
2. **Domain** — `types.ts`: add `<field>: string` to the Row type, the `Form` type, and `EMPTY_*_FORM`; `rules.ts`: add the money check to `validate*Form` (`if (input.<field>.trim() && !isValidMoneyAmount(input.<field>)) return "…must be a valid amount"` — blank OK, 0 allowed); `normalizers.ts`: add to the `*Input` shape (`<field>: { toString(): string } | null`) and the **normalize-on-read** line (the money trap); `export-columns.ts` if exported.
3. **Data** — the module read-repo select: add `<field>: true`. **Every parent projection** that embeds this row: add `<field>: true` (reference build = three selects total). `write-repository.ts`: add a `toMoney(v) = v.trim() ? normalizeMoneyAmount(v) : null` helper and set `<field>: toMoney(draft.input.<field>)` in **both** the `createMany` data and the `update` data.
4. **Application** — **read** the use case + input alias. If pass-through, no change — say so. **Then check every sync/mirror/outbox mapper** (`sync-template-to-work-order.ts` and kin): decide propagation on purpose and, if excluded, leave the enumerated mapper untouched with a comment.
5. **API** — `app/api/<module>/_validators.ts`: reuse the parameterized `optionalMoney(value, path, fail)` helper (blank → `""`, else `isValidMoneyAmount` → `normalizeMoneyAmount`, `fail` is the section's own error class) — add `<field>: optionalMoney(obj.<field>, \`${path}.<field>\`, failDiff)` to the section's row validator. If the helper doesn't exist yet in the module, add it (mirror `_validators.ts:82`).
6. **Module UI** — record-view: add a `MoneyCell` column (`{ key: "<field>", label: "<Label>", width: 140, align: "end" }`) and a `case "<field>":` returning `<MoneyCell editable={editable} value={item.<field>} onChange={…} />`. Then the **hand-enumerated controller sweep** (diff-section shape): `*Local` type, `toLocalItem`, `itemsDiffer`, `createItemsRevisionKey` join string, `toDiffForm`, blank-row `addItem` default (`<field>: ""`). List col + row-cell only if list-visible.
7. **Client save-payload builders (editable only — the trap)** — top-level-record shape: add to `controllers/record/drafts.ts` `toUpdate*Input` **and** `components/record/*-create-client.tsx`. (For the diff-section shape this is the same six controller spots as step 6 — verify none were missed.)
8. **Tests** — domain: update `normalize*` fixture (add `<field>: { toString: () => "10.5" }` → assert `"10.50"`, and a `null` → `""` case); add the two money assertions (**blank valid**, **0 valid**); add the field to every form fixture (`{ ...form, <field>: "" }` — the runtime `.trim()` trap). If a sync mapper exists, add a guardrail test asserting the field is **not** propagated (reference build has one). Add an `export-columns` test if exported.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck` and tests. Don't typecheck before the dist rebuild.
- Run the full gauntlet (`/check-gauntlet`) for a cross-layer change, or at minimum the touched workspaces' tests + web typecheck.
- **Manually reason through the save path AND the read path** — does the field reach the PATCH/POST body, the validator, the DB? And does a saved row read back **canonical** (normalize-on-read) so it isn't falsely-dirty? Both traps pass typecheck. Recommend the user smoke-test: enter `10` → save → reopen → confirm it reads `10.00` and the row is NOT flagged dirty.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; a table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-NEW-CURRENCY — <module>.<field> — Decimal(12,2)   (visibility: list <yes/no> · csv <yes/no> · file <no> · editable <yes/no> · propagates <yes/no>)

═══ Grounding ═══
Target: <module>   Analog traced: <field>   List-visible: <…>   Exported: <…>   Editable: <…>   Propagation: <excluded/carried>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + migration | schema.prisma · migrations/<ts>_<table>_<field> | ✅ authored (unrun), no index |
| Domain | domain/src/.../{types,rules,normalizers}.ts | ✅ money check + normalize-on-read (the trap) |
| Data | db/src/.../{read-repo select ×N, write-repository}.ts | ✅ toMoney + all N selects |
| Application | application/src/.../{use-case, sync mapper} | ✅ pass-through (verified) · propagation <excluded/carried> |
| API | app/api/<module>/_validators.ts | ✅ optionalMoney |
| Module UI | modules/<module>/.../{MoneyCell col, controller sweep ×6} | ✅ |
| Save payload | controller sweep / drafts.ts + *-create-client.tsx | ✅ (the trap) |
| Tests | normalizers + rules (blank/0) + form fixtures + sync guardrail | ✅ |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
Save path + READ path (canonical, not falsely-dirty) reasoned end-to-end: <yes>

═══ Deferred ═══
Index + search bar for <field>: → /column-new-index

═══ Open questions ═══
- <list-vs-detail / propagation / on-file, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Skip the deep-dig and write from the spine alone — it traces a real analog money field across the live code every run.
- Add a non-money column — string is **/column-new-string**; int/bool/enum/phone/date are the other sibling **/column-new-*** skills.
- Add a foreign-key / relation field or a picker — that's a relation job, not this skill.
- Add a DB-generated / sequence column — that's **/row-number**.
- Store money as a float or use `toFixed` — the money standard is a fixed-scale-2 string via `normalizeMoneyAmount`; skip the normalize-on-read and every saved row reads falsely-dirty.
- Add an `@@index`, a search bar, or a server-side filter for the new column — that's **/column-new-index**. Ships searchable-later.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Add a `createdBy`/`updatedBy` actor pair → **/column-actor**; a `createdAt`/`updatedAt` pair → **/column-timestamp**; a PaletteColor chip → **/column-color**; multi-column **sort** → **/column-sort**; a print-file column → **/wo-print-file**.
- Forget the client save-payload builders or the normalize-on-read line — the two traps this skill exists to prevent, both invisible to typecheck.
- Carry the money value into a downstream sync/mirror without deciding it on purpose — the reference build deliberately excludes `cost` from the WO sync.
- Add the field to the printed file/PDF unless the user asks.
- Reshape engine / list-view / record-view chrome, or the export mechanism itself — that's **/engine**.
- Plan or execute whole-module work → **/session-new**; author another skill → **/newskill**.
- Commit, fold the schema into a non-schema commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-new-currency` invocation.
