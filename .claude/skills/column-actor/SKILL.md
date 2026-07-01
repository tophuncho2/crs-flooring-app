---
name: column-actor
description: Master of the createdBy/updatedBy actor-email columns across the schema → domain → data → application → api → module-UI → tests stack. Invoke to install the actor pair onto a candidate module, audit an existing install for layer drift, or consolidate/dedupe divergent implementations. Always classifies the module shape first — single-table, two-table-per-child, or aggregate-root — because the stamping rules differ. Editing skill, not read-only. Explicit-only — invoke on /column-actor.
---

# /column-actor

`/column-actor` makes you the owner of the `createdBy`/`updatedBy` actor-email columns. The user invokes it with a free-form intent — "install actor columns on work-orders", "audit the imports actor install for drift", "products and warehouse diverged, consolidate them". Your job: ground in the live column map, classify the target module's **shape**, and drive the change through every layer the pair touches.

This is an **editing** skill — it reads, classifies, then makes the change across the stack. It is not a read-only audit (that's `/report`/`/dig`) and not a whole-module plan (that's `/newsession`).

## The model (what an actor-column install IS)

The actor pair is **one vertical slice repeated across seven layers**. Each install (or audit) walks the same spine:

`schema (+ migration) → domain types → data selects/repos → application use-cases → api routes → module UI → tests`

Two invariants hold at every layer:

- **`actorEmail` is a guarded use-case parameter, never part of the zod input envelope.** The route reads `access.user.email` and passes it as a separate arg; the use case rejects a blank actor before writing. The client never supplies it.
- **Create stamps both, update flips only `updatedBy`.** `createdBy` is written once on insert and never again. Columns are `String?` (nullable, no backfill) — existing rows legitimately read `—`.

### The three module shapes (classify before touching)

The install diverges by how the module's rows relate. Decide the shape in Step 1.

1. **Single-table** (reference: **warehouse**, **products**, **job-types**, **payments**) — columns on the one row; a `create-*` and `update-*` use case. The clean canonical walk.
2. **Two-table per-child** (reference: **templates**) — parent **and** child both carry the columns. Child items are **updated in place** (not delete+recreate), so the child's `updatedBy` is real signal. The diff applier stamps add=both / edit=`updatedBy`; the section use case threads `actorEmail`. Adding a missing `updatedAt` to a populated child table needs `DEFAULT CURRENT_TIMESTAMP` in the migration.
3. **Aggregate-root** (reference: **imports**) — columns live on the **parent only**; child rows carry none. Every **human** child mutation stamps the parent via a `stampImportActor`-style helper inside the existing parent lock. **System** mutations (worker, deletes) never stamp.

### The human-vs-system boundary

Only a human action stamps. Worker/relay jobs (e.g. `materialize-imported-rows`) and row removals (`delete-import`) take no `actorEmail` and must stay byte-identical. If a mutation has no authenticated user behind it, it does not stamp.

### Done vs candidate (verify against the schema each run — this drifts)

- **Done (all 4 columns):** Property, FlooringProduct, FlooringImportEntry, FlooringJobType, FlooringPayment, FlooringTemplate, FlooringTemplateItem, FlooringWarehouse, FlooringEntityType.
- **Candidate (has `createdAt`/`updatedAt`, missing the actor pair):** Entity, FlooringCategory, FlooringUnitOfMeasure, FlooringInventory, FlooringInventoryAdjustment, FlooringImportStagedInventoryRow, FlooringImportStagedInventoryFilterRow, FlooringWorkOrder, FlooringWorkOrderItem.
- **N/A:** User / UserLoginActivity / AppMutationReceipt / QueueOutboxEvent / EntityEntityType.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-scan `packages/db/prisma/schema.prisma` for the 4 columns and re-classify the target's shape. Never act on the done/candidate list above without confirming it against the live schema.
- **Classify the module shape first.** Single-table, two-table-per-child, and aggregate-root have different stamping rules. Picking wrong corrupts the install. inventory/adjustments has **no baked rule** — decide its shape with the user when it comes up.
- **Mirror job-types/warehouse exactly.** The single-table walk is the canonical reference. Two-table mirrors templates; aggregate-root mirrors imports. Do not invent a fourth pattern.
- **`actorEmail` is a guarded param, never in the input envelope.** Non-empty guard in the use case; route passes `access.user.email`. **Create stamps both; update stamps `updatedBy` only.** Columns are `String?`, nullable, no backfill.
- **System mutations never stamp.** Workers, relay jobs, and deletes take no `actorEmail` and stay untouched.
- **Aggregate-root + OCC:** when a child mutation bumps the parent's `updatedAt`, the client MUST push the fresh parent back via `publishRecord` or the next save 409s. Thread it or the install is broken.
- **The user runs migrations — never the skill.** Author the SQL migration file alongside the schema edit (double-quoted identifiers, `TEXT`, nullable, no backfill), but never run `db:deploy`. Per `author-migration-with-schema-edit`, `db:deploy` only applies pre-written files.
- **dist-rebuild order before typecheck.** `@builders/domain` + `@builders/db` are consumed via built `dist/`. After editing their types run `npm run db:generate` (schema changed) then build domain → db → application **before** `npm run typecheck` sees the new fields.
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words; schema changes are their own commit.
- **Drive, don't multiple-choice.** Surface genuine open questions (module shape for inventory/adjustments, a missed select copy) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/column-actor`. Not on "add a created-by column", "who edited this", "actor tracking".

## Step 1 — Ground in the live column map

Before classifying the task, read the current reality:

1. **Schema** — scan `packages/db/prisma/schema.prisma` for `createdBy` / `updatedBy` / `createdAt` / `updatedAt` across every model. Confirm the target is a candidate (or, for an audit, already done).
2. **Shape** — classify the target: single-table, two-table-per-child, or aggregate-root. Check whether the module has child/item tables, a record-view with shared sections, and a row-lock.
3. **Memory** — read `actor-columns-rollout` (the spine: canonical pattern + every module's wrinkles), `author-migration-with-schema-edit`, and `main-backups-roll-into-staging-dev` (env rollout). Treat as context; verify against code.
4. **Reference impl** — open the closest done module to the target's shape (warehouse for single-table, templates for two-table, imports for aggregate-root) and read its layers as the template.

State what you found in one tight block (target module, shape, candidate/done, reference impl) before proposing the change.

## Step 2 — Classify the task

Match the user's ask to one of these:

- **A. Install** — the target is a candidate; walk all seven layers (Step 3).
- **B. Audit** — the target is (or claims to be) done; verify each layer carries the pair with no drift (missing select copy, normalizer passthrough, route arg, UI cell). Read-only output — report gaps as a checklist, then offer to fix.
- **C. Consolidate / dedupe** — two+ modules diverged; converge them on the canonical shape, dropping per-module variance.

## Step 3 — Execute the seven-layer walk

For an **install** (shape branches noted inline):

1. **Schema + migration** — add `createdBy String?` + `updatedBy String?` (camelCase, no `@map`) to the target model in `packages/db/prisma/schema.prisma`. Author `packages/db/prisma/migrations/<ts>_<module>_actor_columns/migration.sql` with double-quoted identifiers, `TEXT`, nullable, no backfill. *(Aggregate-root: parent model only. Two-table: parent + child; if the child lacks `updatedAt`, add it with `DEFAULT CURRENT_TIMESTAMP`.)*
2. **Domain** — add `createdBy/updatedBy: string | null` to the row + list-row types in `packages/domain/src/.../types.ts`, plus normalizer passthrough if present. Decouple app input types from db-write aliases with `Omit<…, "createdBy" | "updatedBy">` where they aliased directly.
3. **Data** — add `createdBy: true, updatedBy: true` to **every** select shape (watch for a detail select **duplicated** across read- and write-repository — both must change). Pass the fields through the normalizer; `Create*Input` requires both, `Update*Input` requires only `updatedBy`; create stamps both, update stamps `updatedBy`. *(Aggregate-root: add a `stampImportActor(tx, parentId, actorEmail)`-style write-repo helper instead of per-child columns. Two-table: the diff applier stamps add=both / edit=`updatedBy`.)*
4. **Application** — `create-*`/`update-*` use cases gain a guarded `actorEmail: string` param (non-empty check, NOT in the input envelope); create stamps both, update flips `updatedBy`. *(Aggregate-root: every human child use case calls the stamp helper inside the existing parent lock — create-import, update-import, save-staged-section, mark-for-import; never the worker or delete. Two-table: the section use case threads `actorEmail` to the diff applier.)*
5. **API** — the create + update/section routes pass `access.user.email` as the `actorEmail` arg.
6. **Module UI** — add two list columns ("Created by"/"Updated by", `row.x ?? "—"`) and two read-only record-view `StaticFieldValue` cells after Created/Updated. *(Aggregate-root: parent-only, surfaced on the parent's list + record view.)* **OCC:** if a child/item section save now bumps the parent's `updatedAt`, thread `publishRecord(response.parent)` into the section (mirror imports `use-import-record-controller.ts` `reconcileAfterWrite` / work-orders `work-order-record-panel.tsx` `publishWorkOrder`) so the next save doesn't 409.
7. **Tests** — thread an `ACTOR` const through the use-case tests; add a blank-actor-rejected test and a stamps-actor test. Two-table/aggregate-root: cover the child-mutation stamping path.

## Step 4 — Verify

- **Build order:** `npm run db:generate`, then build domain → db → application, **then** `npm run typecheck`. Don't typecheck before the dist rebuild — it won't see the new fields.
- Run the module's app-layer tests. Report real counts.
- For an **audit**, walk each layer against the checklist and report which carry the pair vs which drifted.

## Step 5 — Report (per project CLAUDE.md)

Headline + counts + TL;DR in the chat; table for the layer-by-layer detail. Open questions in the response. End with a commit message — but **do not commit**; schema is its own commit.

```
COLUMN-ACTOR — <module> — <install | audit | consolidate>   (shape: <single | two-table | aggregate-root>)

═══ Grounding ═══
Target: <module>   Shape: <…>   Status: <candidate | done>   Reference: <warehouse | templates | imports>

═══ Layers ═══
| Layer | File(s) | Change |
|---|---|---|
| Schema + migration | schema.prisma · migrations/<ts>_<module>_actor_columns | ✅ authored (unrun) |
| Domain | domain/src/.../types.ts | ✅ |
| Data | db/src/.../{shared,read-repository,write-repository}.ts | ✅ |
| Application | application/src/.../{create,update}-*.ts | ✅ guarded actorEmail |
| API | app/api/<module>/... | ✅ access.user.email |
| UI | modules/<module>/... | ✅ 2 cols + 2 cells |
| Tests | application/tests/.../*.test.ts | ✅ blank-reject + stamps |

═══ Verify ═══
db:generate + build domain→db→application → typecheck: <PASS | N errors>   Tests: <N pass>
OCC / publishRecord touched: <yes — section X | n/a>

═══ Open questions ═══
- <module shape call / duplicated select / migration timing, or "none">

═══ Commit message ═══
<≤17 words; schema in its own commit>
```

## What this skill does NOT do

- Act on the done/candidate list without re-scanning the live schema and re-classifying the module shape.
- Run migrations or `db:deploy` — it authors the SQL file; the user runs it.
- Touch `createdAt`/`updatedAt` or their `formatEasternDateTime` display — that's **/column-timestamp**.
- Plan or execute whole-module work, or any other column sweep — that's **/newsession**.
- Build or reshape engine / list-view / record-view chrome — that's **/engine**.
- Stamp system/worker mutations or deletes, or put `actorEmail` in the zod input envelope.
- Bake a stamping rule for inventory/adjustments — its shape is decided with the user per session.
- Commit, or fold the schema change into a non-schema commit.
- Multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/column-actor` invocation.
