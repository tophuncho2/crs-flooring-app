---
name: full-rename
description: Rename a concept (model + column + every symbol, path, label, route, telemetry string, and cross-module reference) in place across every layer, end to end, with zero behavior change. Invoke when a module/entity/field is being renamed wholesale — e.g. "rename Management Companies → Entities", "rename warehouse → store", "rename the number field to code everywhere". Validates scope against live code first, settles the genuinely-ambiguous decisions with the user, then executes the layered playbook with git-mv + symbol-map + parallel fan-out + the build-before-typecheck discipline that defeats the stale-dist trap. Editing skill, not read-only. Explicit-only — invoke on /full-rename.
---

# /full-rename

`/full-rename` makes you the surgeon for a wholesale, in-place rename. The user invokes it with a free-form intent — "rename Management Companies → Entities", "rename warehouse → store across the stack", "the `number` column should be `code` everywhere". Your job: prove the scope against live code, settle the handful of decisions only the user can make, then drive the rename through **every layer** so the concept reads uniformly under its new name and `/check` is green — with **no new behavior**.

This is an **editing** skill — it reads, settles decisions, then makes the change across ~50–170 files. It is not the pre-rename research pass (that's `/session-new`), not the engine-folder move (that's `/engine`), and not the gauntlet (that's `/check`).

## The model (what a full rename IS)

A full rename is a **pure rename, never a refactor**: the same rows, the same control flow, the same behavior — only the *name* changes, everywhere, at once. "Done" = the old name returns **zero** source hits (outside generated code and historical migrations) and `/check` is green.

It propagates down the project's layer cascade (root `CLAUDE.md`), and the renamer who stops early leaves a broken build:

- **Schema** — `packages/db/prisma/schema.prisma`: the model, its `@@map` table, the renamed column, and **every relation field + `@@index` on other models that point at it** (e.g. `Property.managementCompanyId` → `entityId`). Leave unrelated same-named fields alone (a `Property.name` is not the renamed concept's name).
- **Migration** — a NEW `prisma/migrations/<ts>_<desc>/migration.sql`, a **pure `ALTER ... RENAME`** (table, column, FK constraint, index, pkey). Preserves rows; no backfill. You write it; **the user runs `db:deploy`** (per `author-migration-with-schema-edit`).
- **Domain → Data → Application** — `packages/{domain,db,application}/src/management|flooring/<module>/`: dir rename, types, normalizers, form-rules, error-messages/codes, repositories (Prisma accessor `client.<model>`, `Prisma.<Model>WhereInput`, every `select`/`orderBy`/`where` on the renamed column), use-cases, filters.
- **API** — `apps/web/app/api/<module>/`: dir rename, route path strings, rate-limit **scopes**, `entityType` telemetry value, response keys, validators + messages.
- **Module dir** — `apps/web/modules/<module>/`: dir rename (often 30+ files), list-columns, headings, record-view labels, create/quick-create strings, picker headings, query-keys, request parsers, controllers.
- **Pages** — `apps/web/app/dashboard/<module>/`: dir rename, client import, query key, error strings + `errorCode`.
- **Engines / nav / PDF** — cascade/picker engine folder + seed keys (`@/engines/...`), `app-shell/navigation/definitions.ts` slug+name+href **and** `nav-rail.tsx` icon-map key (move together), `hooks/navigation/routes.ts` query keys, `file-generation/` print `<th>` label + DTO field.
- **Cross-module references** — properties/templates/work-orders/inventory that *point at* the renamed concept: relation/DTO fields, nested `where`/`orderBy`/`select`, list-columns, filter chips, labels — and **the consumer dashboard pages + options API routes that are NOT inside the renamed module dir** (the most-missed surface).
- **Tests** — unit/engine/e2e mirroring every renamed symbol, plus hardcoded path-string assertions and PDF snapshots.

### The decision flags (settle with the user, never assume)

A few choices change the blast radius and only the user owns them. Default to **asking** (Step 2), not guessing:

- **Model name** — keep the project prefix (`FlooringEntity`) or go bare (`Entity`)? (Match the convention every other model uses.)
- **Field rename** — does the JS/DB display field rename too (`name` → `entity`), or only the model/symbols while the field stays `name`? (Renaming the field multiplies the surface — normalizers, list-keys, API payloads, PDF DTO — and can read "doubled", e.g. `entity.entity`.)
- **URL/API/nav paths** — rename `/dashboard/<old>` → `/dashboard/<new>`, `/api/<old>` → `/api/<new>`, the nav slug? (Breaks bookmarks.)
- **Telemetry/scopes/error-codes** — rename `scopes`, `entityType` value, `ERROR_CODE_*`? (Orphans historical analytics keyed on the old strings.)

## Hard rules

- **Validate before you touch.** Run Step 1 every time — the live schema, the file inventory, and the naming-collision surface all differ from any brief. Trust the code over the brief; note discrepancies. A handed-in brief is a map, not a substitute for reading.
- **Settle the flags with the user first.** The model-name / field-rename / path / telemetry decisions are the user's — `AskUserQuestion` them up front (Step 2). Everything *downstream* of those answers you drive without prompting.
- **Pure rename, zero behavior change.** No new model, no new column, no new linking, no logic edits. If you find yourself changing a predicate or adding a field, stop — that's out of scope.
- **Preserve history.** `git mv` every directory/file (never delete-then-recreate) so blame survives; then rewrite contents. The harness requires a **Read before Edit/Write** on each moved file even though the bytes are unchanged.
- **Never hand-edit generated code.** `packages/db/src/generated/prisma/` regenerates from the schema — run `npm run db:generate` after the schema edit; never touch those files. They pollute grep — exclude `/generated/`, `/dist/`, `/.next/`, `*.tsbuildinfo`, and **historical** migrations from every sweep.
- **Build before you typecheck across packages.** `@builders/db|application|web` resolve `@builders/domain` etc. to compiled `dist/`. After the schema/domain edit, run `npm run build` (or at least `db:generate`) so cross-package typecheck reflects the new names — otherwise you chase phantom "no exported member" errors against stale dist (the gotcha in `actor-columns-rollout`).
- **Author the migration; do NOT run it.** Pure `ALTER ... RENAME`; verify the **live** generated FK/index/constraint names first; the user runs `db:deploy`. Never edit historical migration files.
- **DO NOT COMMIT.** Provide a commit message ≤17 words; the user commits. Schema/migration is fine in the rename commit since the whole change is one rename.
- **Drive, don't multiple-choice.** Beyond the Step-2 flags, lay out the plan and execute; surface genuine boundary discoveries in your response, not as menus.
- **Explicit-only.** Trigger on the literal `/full-rename`. Not on "rename this", "can you rename", "let's rename X".

## Step 1 — Validate scope against live code

Don't act on a brief or memory alone. Fan out **parallel `Explore` agents** (read-only) to prove three things, then read the schema yourself:

1. **Schema + migration facts** — the model block + line range, the renamed column (and whether it has `@map`), every relation field / `@@index` / FK on *other* models pointing at it, and the **live Postgres-generated** constraint/index/pkey names (grep the baseline + create migrations: `<table>_<col>_fkey`, `<table>_<col>_idx`, `<table>_pkey`). You need the real names before writing the migration.
2. **File + symbol inventory** — every dir/file carrying the old token across all layers, **plus the short-forms a naive grep misses**: `\bmc\b`, `Mc`, `mgmt`, `Mgmt`, `mgmt-co` (case-sensitive). Count files per top-level dir for blast radius. Flag the generated Prisma files (regenerate, don't edit).
3. **Collision + ambiguity surface** — does the new name already exist as a model/type? Do `entityType`/`entityId`-style strings already live in telemetry (a rename to `entity*` risks ambiguity)? Which same-named fields on *other* models (`Property.name`) must be left alone?

State findings in one tight block (schema facts, file count per dir, collisions, short-forms) before proposing anything. If a handed-in brief disagrees with the code, the code wins — say so.

## Step 2 — Settle the rename decisions with the user

`AskUserQuestion` the **decision flags** (model name, field rename, URL/path rename, telemetry/error-code rename) — recommend the option that matches the existing convention, but let the user choose; each has a real downside (doubled reads, broken bookmarks, orphaned analytics). Lock the answers into a **canonical symbol map** (old → new) covering: model, table, column, every `*Symbol`/type, error codes, scopes, `entityType` value, query keys, route paths, nav slug, labels, and the short-forms. The map is the contract every later step (and every fan-out agent) follows verbatim.

## Step 3 — Execute layer by layer, top of the playbook down

Work the cascade in dependency order so each layer compiles before the next leans on it: **schema → migration → (`db:generate`) → domain (+tests) → data → application (+tests) → api → barrels → module dir → pages → engines → nav/routes → PDF → cross-module → tests.** For each renamed directory: `git mv` it, then Read + rewrite each file against the symbol map. Update the three package barrels (`packages/{domain,application,db}/src/index.ts`) early so downstream packages resolve.

**Fan out the directory-isolated tail.** Once the backend + API are renamed, the remaining work splits into **non-overlapping directory trees** — the module dir, the consumer pages, the cross-module backend, the cross-module frontend + engine. Dispatch these to parallel **forks** (each inherits your context and the exact symbol map; assign disjoint dirs; tell them not to run `/check` and to report boundary contracts they now depend on). Then **reconcile the seams yourself**: renamed component prop names, API response keys, query-key export names, and the consumer dashboard pages / options API routes that no fork owned.

## Step 4 — Author the migration (pure rename, do NOT run)

NEW `packages/db/prisma/migrations/<ts>_<desc>/migration.sql`, timestamped *after* the latest existing one. Pure renames using the **live** names verified in Step 1:

```sql
ALTER TABLE "<old_table>" RENAME TO "<new_table>";
ALTER TABLE "<new_table>" RENAME COLUMN "<old_col>" TO "<new_col>";
ALTER INDEX "<old_table>_pkey" RENAME TO "<new_table>_pkey";
ALTER TABLE "<fk_table>" RENAME COLUMN "<old_fk>" TO "<new_fk>";
ALTER INDEX "<fk_table>_<old_fk>_idx" RENAME TO "<fk_table>_<new_fk>_idx";
ALTER TABLE "<fk_table>" RENAME CONSTRAINT "<fk_table>_<old_fk>_fkey" TO "<fk_table>_<new_fk>_fkey";
```

Preserves every row; no backfill, no new column. The user runs `db:deploy` per env (recall `main-backups-roll-into-staging-dev`: dev/staging share prod's shape; the dev DB may be shared across `dev-N` worktrees, so the migration may already be applied there).

## Step 5 — Rebuild, sweep, verify

- **Rebuild dists first:** `npm run build` (it runs `db:generate` + compiles each package in order) so cross-package typecheck is honest, not stale-dist noise.
- **Typecheck to surface the misses at once** rather than hunting: the classic residual is a `.<oldField>` read left on a renamed type (e.g. `.name` on a record whose field is now `entity`) — fix each to the new field.
- **Straggler grep** (exclude `/generated/`, `/dist/`, `/.next/`, `*.tsbuildinfo`, historical migrations): the old token, `ManagementCompany`-style PascalCase, kebab paths, the nav slug, AND short-forms `\bmc\b`/`Mgmt`/`mgmt-co` — all must return zero in hand-written source. Prose "MC" in comments is a cosmetic last pass.
- **Don't exclude `.md` from the prose pass.** The layered `CLAUDE.md` docs and `packages/domain/BUSINESS-LOGIC.md` carry old-concept prose ("the MC→Property→Template cascade", "belongs to one management company") that a source-only grep skips. Sweep docs in the same pass — a green build never catches these.
- **Hunt dead shadow-types — the orphan a green build hides.** A module-local type alias named after the renamed concept (e.g. a WO-local `EntityOption = { id; name }`) silently shadows the domain type of the same name; if nothing imports the local one it's dead code that still compiles. After the rename, grep each renamed `*Option`/DTO name and confirm the local copy is actually imported — if not, delete it (it also confuses the next reader who assumes it's the domain type).
- **Run `/check`.** Report the structured table. Note that unit/engine tests are DB-independent (green without the migration) but **e2e / live-DB behavior needs `db:deploy` first**.
- **Watch the empty-migration-husk trap:** a tool that creates a migration folder without writing `migration.sql` leaves an empty dir that git can't track and `db:deploy` chokes on (P3015). If you ever made one, `find packages/db/prisma/migrations -type d -empty` and `rmdir` it.

## Step 6 — Report (per project CLAUDE.md)

Headlines + counts + a `/check` table in the chat; details in a table. Open questions (boundary discoveries, anything you left intentionally) in the response. End with the ≤17-word commit message. **Do not commit; do not run the migration.**

```
FULL-RENAME — <old> → <new>   (<N> files, <M> layers)

═══ Grounding ═══
Schema: <model L#, col, @map>   FK/index live names: <...>   Files: <N> (per-dir: ...)   Short-forms: <mc/mgmt/...>   Collisions: <none / note>

═══ Decisions (with user) ═══
Model: <bare/prefixed>   Field rename: <yes/no>   Paths: <renamed/kept>   Telemetry: <renamed/kept>

═══ Layers ═══
schema ✅  migration ✅(unrun)  domain ✅  data ✅  application ✅  api ✅  module ✅  pages ✅  engine ✅  nav ✅  pdf ✅  cross-module ✅  tests ✅

═══ Verify ═══
build ✅   typecheck ✅   lint ✅(N warn)   test ✅(X/Y)   straggler grep: <0 hits>   migration: NOT run (user → db:deploy)

═══ Open questions ═══
- <boundary seam / left-intentionally, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on a handed-in brief or memory without re-validating the schema facts, file inventory, and collision surface against live code first.
- Assume the model-name / field-rename / path / telemetry decisions — those are `AskUserQuestion` for the user; never default them silently.
- Add behavior, a new model, a new column, or new linking — a rename changes only the name.
- Hand-edit generated Prisma files, or grep without excluding generated/dist/.next/historical-migrations.
- Typecheck across packages before rebuilding dists (the stale-dist phantom-error trap).
- Run the migration, or edit a historical migration file — author the new pure-rename SQL; the user runs `db:deploy`.
- Commit the change, or exceed a 17-word commit message.
- Do the upstream module *research* (that's `/session-new`), the engine-folder *move design* (that's `/engine`), the cross-branch *work split* (that's `/dispatch`), or the gauntlet (that's `/check`) — call those by name.
- Trigger on anything but the literal `/full-rename` invocation.
