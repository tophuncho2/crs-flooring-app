---
name: column-timestamp
description: Master of the createdAt @default(now()) / updatedAt @updatedAt timestamp pair and their Eastern-time display across the schema → domain → data → application → api → module-UI stack. The pair is already installed where needed, so this skill leans audit + formatting + parity — verify presence/parity, consolidate display onto formatEasternDateTime, or install a missing column (e.g. the templates-item updatedAt precedent). Knows updatedAt IS the optimistic-concurrency token and refuses to break that contract. Editing skill, audit-leaning. Explicit-only — invoke on /column-timestamp.
---

# /column-timestamp

`/column-timestamp` makes you the owner of the `createdAt`/`updatedAt` timestamp pair and how they render. The user invokes it with a free-form intent — "audit which models are missing updatedAt", "this list shows a raw ISO string, normalize it", "templates-item needs updatedAt for parity". Your job: ground in the live timestamp map, classify the task, and drive it without ever breaking the optimistic-concurrency contract `updatedAt` carries.

This is an **editing** skill, but its center of gravity is **audit + formatting** — the pair is already deployed on every model that needs it, so most sessions verify parity or normalize display rather than install. It is not a read-only audit shell (that's `/report`/`/dig`) and not a whole-module plan (that's `/newsession`).

## The model (what the timestamp pair IS)

The pair is **DB-managed**, unlike the actor columns:

- `createdAt DateTime @default(now())` — written once by the database on insert.
- `updatedAt DateTime @updatedAt` — bumped by Prisma on every write to the row.

There is **no `actorEmail`, no app-layer stamping, no use-case param**. The application never sets these — it reads them. That is the whole difference from `/column-actor`.

### Display standard

Timestamps render through **`formatEasternDateTime`** (or `formatEasternDate`) from `@builders/domain`, applied at the **UI boundary** (list column cell / record-view `StaticFieldValue`), guarded with `?? "—"`. A raw ISO string reaching the UI is a drift to fix. This formatting concern is what `column-actor` explicitly defers here — actor cells show plain emails (no formatting); every date/time display is this skill's.

### `updatedAt` IS the OCC token (handle with care)

Record-view sections share **one optimistic-concurrency token = `record.updatedAt`**, sent as `revisionKey` / `expectedUpdatedAt` and checked by `assertExpectedUpdatedAt`. Consequences:

- **Never repurpose, rename, or change the write semantics of `updatedAt`.** It is load-bearing for save-conflict detection across the whole record view.
- Any child/item mutation that bumps the **parent's** `updatedAt` must push the fresh parent back via `publishRecord` or the next save 409s. Refs: imports `apps/web/modules/imports/controllers/record/use-import-record-controller.ts` (`reconcileAfterWrite`), work-orders `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` (`publishWorkOrder`).

### Presence map (verify against the schema each run — this drifts)

Nearly every domain model already carries both. Known gaps/edge cases at last scan of `packages/db/prisma/schema.prisma`:

- **`createdAt` only (no `updatedAt`):** User, AppMutationReceipt, EntityEntityType (join).
- **Neither / bespoke:** UserLoginActivity (uses `loggedInAt`).
- **Precedent for installing a missing one:** FlooringTemplateItem gained `updatedAt @updatedAt` for parity — a populated child table, so the migration used `DEFAULT CURRENT_TIMESTAMP` to seed existing rows.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-scan the schema for `createdAt`/`updatedAt` and re-find the `formatEasternDateTime` usages. The presence map above drifts.
- **`updatedAt` is the OCC token — never break the contract.** Don't change its write semantics, don't rename it, don't strip it from a select that a `revisionKey`/`expectedUpdatedAt` path depends on. A child mutation that bumps a parent's `updatedAt` must `publishRecord` the fresh parent.
- **Timestamps are DB-managed — never stamp from app code.** No `actorEmail`, no use-case param, no manual `set`. `@default(now())` and `@updatedAt` own the values.
- **Display goes through `formatEasternDateTime` at the UI boundary**, guarded `?? "—"`. Don't format in the domain/data layer; don't leak a raw ISO string to the UI.
- **Adding `updatedAt` to a populated table needs a backfill default.** Use `DEFAULT CURRENT_TIMESTAMP` in the migration (templates-item precedent) so existing rows get a value.
- **The user runs migrations — never the skill.** Author the SQL file alongside any schema edit (double-quoted identifiers), but never run `db:deploy`. Per `author-migration-with-schema-edit`, `db:deploy` only applies pre-written files.
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed via built `dist/`. After editing their types run `npm run db:generate` then build domain → db → application **before** `npm run typecheck`.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; schema changes are their own commit.
- **Drive, don't multiple-choice.** Surface genuine open questions (is a missing `updatedAt` wanted, or is the model intentionally insert-only?) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/column-timestamp`. Not on "when was this updated", "add a timestamp", "format the date".

## Step 1 — Ground in the live timestamp map

Before classifying the task, read the current reality:

1. **Schema** — scan `packages/db/prisma/schema.prisma` for `createdAt` / `updatedAt` across every model; note any model carrying one but not the other, or neither.
2. **Display** — grep `formatEasternDateTime` / `formatEasternDate` usages across `apps/web/modules/*` to see the rendering standard, and look for any raw ISO timestamp reaching a cell (the drift).
3. **OCC** — locate the `revisionKey` / `expectedUpdatedAt` / `assertExpectedUpdatedAt` / `publishRecord` seams so you know which `updatedAt` reads are load-bearing before editing a select.
4. **Memory** — read `actor-columns-rollout` (carries the OCC/publishRecord pattern + the templates-item `updatedAt` precedent) and `author-migration-with-schema-edit`. Treat as context; verify against code.

State what you found in one tight block (target, what's present, formatting standard, OCC seams) before proposing the change.

## Step 2 — Classify the task

Match the user's ask to one of these:

- **A. Audit parity/presence** — verify which models carry both, which carry one, which render through `formatEasternDateTime`. Read-only output — a checklist of gaps with `path:line`, then offer to fix.
- **B. Consolidate formatting** — a timestamp renders raw or via a one-off formatter; converge it onto `formatEasternDateTime` at the UI boundary with the `?? "—"` guard.
- **C. Install a missing column** — a model needs `updatedAt` (or `createdAt`) for parity; add it through schema → migration (`DEFAULT CURRENT_TIMESTAMP` if the table is populated) → domain type → data selects/normalizer → UI cell. **No app stamping** — the DB owns the value.

## Step 3 — Execute

- **Audit (A):** walk each model/cell against the standard; report present / one-only / unformatted with cites. Don't edit beyond what the user approves.
- **Formatting (B):** swap the raw/one-off render for `formatEasternDateTime` from `@builders/domain` at the cell, guarded `?? "—"`. Confirm the value still flows through the select + normalizer untouched.
- **Install a column (C):** schema edit + authored migration (`DEFAULT CURRENT_TIMESTAMP` for a populated table); add the field to the row type + every select + normalizer passthrough; surface the cell via `formatEasternDateTime`. If a new `updatedAt` on a child now bumps a parent, confirm the parent's `publishRecord` path is intact so saves don't 409. **Never** add an app-layer set/stamp.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck`.
- If `updatedAt` selects changed, sanity-check the OCC path: a save still sends `revisionKey`/`expectedUpdatedAt` and a child save still `publishRecord`s the parent.
- For an **audit**, report the parity/formatting checklist with real `path:line`.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-TIMESTAMP — <module/scope> — <audit | format | install>

═══ Grounding ═══
Scope: <…>   Present: <both | createdAt-only | none>   Formatting: <formatEasternDateTime | raw drift>   OCC seam: <touched? >

═══ Change ═══
| Layer / cell | File(s) | Change |
|---|---|---|
| ... | ... | ✅ / ⚠️ |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>
OCC intact (revisionKey / publishRecord): <yes | n/a>

═══ Open questions ═══
- <intentional insert-only? populated-table backfill? or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Act on the presence map without re-scanning the live schema and the `formatEasternDateTime` usages first.
- Touch `createdBy`/`updatedBy` actor-email columns, add an `actorEmail` param, or stamp from app code — that's **/column-actor**.
- Change `updatedAt`'s write semantics, rename it, or strip it from a select an OCC `revisionKey`/`expectedUpdatedAt` path depends on.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Format timestamps anywhere but the UI boundary, or leak a raw ISO string to a cell.
- Plan whole-module work → **/newsession**; reshape engine / list-view / record-view chrome → **/engine**.
- Commit, or fold the schema change into a non-schema commit.
- Multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-timestamp` invocation.
