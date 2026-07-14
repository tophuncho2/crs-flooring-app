---
name: engine
description: Master of apps/web/engines/ — the self-contained client engines (record-view, list-view, picker) imported as @/engines/<name>. Invoke at any point to migrate a module onto an engine, extract/pull a misplaced primitive or controller into an engine, upgrade or extend an engine, fix an engine issue, or organize an engine's internals. Grounds in the live engine tree + the components/ primitive contract before acting, keeps every engine self-contained behind its barrel (the "cage"), and drives the change with the proven git-mv + import-rewrite + /check-gauntlet technique. Editing skill, not read-only. Explicit-only — invoke on /engine.
---

# /engine

`/engine` makes you the owner of `apps/web/engines/`. The user invokes it with a free-form intent — "migrate inventory onto record-view", "the expandable grid is split across components/ and controllers/, pull it into the engine", "the picker barrel is leaking deep paths", "organize the cascade namespace". Your job: ground in the live engine tree, classify the intent, and drive the change while keeping every engine self-contained behind its barrel.

This is an **editing** skill — it reads, plans tightly, then makes the change. It is not a read-only audit (that's `/dig`) and not a build gauntlet (that's `/check-gauntlet`).

## The model (what an engine IS)

A **client engine** is cross-module React orchestration + a view stack, packaged as **one self-contained top-level folder** at `apps/web/engines/<name>/`, imported everywhere as `@/engines/<name>` (the `@/* → ./*` alias in `apps/web/tsconfig.json` covers it — no tsconfig change to add one). Engines are **deployed primarily to `apps/web/modules/`** — a module's components/controllers consume the engine; the engine never reaches back.

Current engines (verify against the tree each run — this list drifts):
- **`common`** — the shared base the other three sit on: `contracts/ controls/ badges/ headers/ feedback/ theme/` + `positioning/`, `popover-layer-stack`, and the shared cell/row atoms (`CellActionButton`, `RecordOpenButton`, `CellAddButton`, `RecordDeleteButton`). `picker`/`list-view`/`record-view` all depend inward on it.
- **`picker`** — the selection surface (dropdowns + async-rich combos + entity cascade + filter chips): `contracts/ controls/ client/ async-option/ chrome/ combo/ filter/`.
- **`list-view`** — list table + toolbar + server-list controllers: `client/ table/ toolbar/ shell/ policies/`.
- **`record-view`** — record detail/create view stack (15 buckets): `adapters/ contracts/ client/ cells/ fields/ forms/ layout-grid/ grid/ panel/ sections/ shell/ feedback/ features/ dialogs/ composites/`.

**Per-engine children.** A change scoped to ONE engine has its own child skill carrying that engine's detailed model + A–E playbook: **`/engine-picker`**, **`/engine-lv`** (list-view), **`/engine-rv`** (record-view). `/engine` owns the **cross-engine** concerns — migrating between engines, promoting/dissolving a sub-engine, moving an atom into or out of **`common`**, and any barrel discipline that spans engines. Reach for a child when the work lives inside one engine; reach for `/engine` when it crosses the boundary.

### Internal bucket convention

Every engine is organized into **buckets**, each re-exported from the engine's root `index.ts` barrel:

- **`contracts/`** — types, type aliases, enums, and helper functions over those types. **No JSX, no React imports.** This is the same rule `components/` enforces on its `contracts/` subfolders.
- **`client/`** — the orchestration layer: controllers (`use-*-controller.ts`), hooks (`use-*.ts`), scaffolds (`*-client-scaffold.tsx`), and `utils/`. See record-view's `client/{controllers,hooks,scaffolds,utils}/` for the canonical shape.
- **Presentation buckets** — engine-specific, named by role: record-view's `shell/ sections/ panel/ forms/ feedback/`, list-view's `table/ toolbar/`, picker's `chrome/ controls/ cascade/`.
- **Sub-engines** nest as their own folder carrying their own `contracts/`/`client/`/`components/` (e.g. `picker/controls/async-rich-dropdown/`, `picker/cascade/`). A sub-engine earns its own folder when it's independently reusable; it dissolves back into the shared buckets once it isn't (the picker memory notes `cascade/` and `chrome/` are expected to flatten over time).

### Barrel + import discipline

- **Single public surface.** The root `index.ts` does `export * from "./<bucket>"` for each bucket. Consumers import **only** from `@/engines/<name>` — never a deep path like `@/engines/picker/cascade/...`.
- **Engine-internal files use relative imports** (`../../client`, `../chrome`) — never the engine's own barrel — to avoid a self-referential cycle.
- **Named exports only.** Barrels re-export named symbols; no default exports.

### The cage (dependency rules)

The whole point of one folder per engine is that a problem triages instantly as **engine vs backend**. That only holds if the boundary holds:

- **Depends outward only** on shared primitives: `@/components/*`, `@/engines/common`, `@/types`, `@/transport`, `@/query-policies`, etc. Nothing those primitives own reaches back **into** the engine. (The one sanctioned inversion in the repo: `components/cells/dropdown-cell` composes `SelectDropdown` from `@/engines/picker`.)
- **Siblings never depend on each other.** `picker`/`list-view`/`record-view` may depend on `common` but not on one another. The two sanctioned shared seams: record-view child-grids reuse the list-view `DataTable`, and `useRecordSectionPagination` (`RECORD_VIEW_PAGE_SIZE=15`) physically lives in the `list-view` barrel but serves record-view sections. Treat both as shared seams, not cage breaks — and never duplicate them.
- **Never imports from `apps/web/modules/*`.** When an engine needs module data, it's **data-injected** — the consumer supplies `pagedSearchFn` / `toOption` / `bucketKey` / etc. (cascade picker is the reference). This is what keeps an engine deployable to many modules.
- **No re-export indirection.** Do NOT re-export engine symbols back out through `@/controllers` or `@/components`. That split-across-two-trees indirection is exactly the `modules/shared/engines` debt that was retired — one contained folder is the whole idea.
- The boundary is **convention-only** today (no eslint `no-restricted-paths`). You are the enforcement.

### Engine vs primitive (the consolidation target)

`apps/web/components/` holds **pure UI primitives** — the three-grid model (`grid/`, `layout-grid/`, `fields/`, `cells/`) plus `dialogs/ nav/ badges/ headers/ features/ theme/`. Read `apps/web/components/CLAUDE.md` — it is the contract between primitives and engines, and engines depend **inward** on it.

A primitive that has grown an orchestration half — a controller in `apps/web/controllers/`, a hook split off from its component — is **split-brain**, and that's the classic `/engine` job. The intuition from the user's first use case: the expandable grid living in both `components/grid/expandable-rows/` and `controllers/expandable-rows/` is one concept spread across two trees; it belongs consolidated into the engine that owns it. The test for "primitive stays in `components/` vs. pulls into an engine": a *pure, module-agnostic, chrome-free* UI atom stays a primitive; an atom that carries cross-module orchestration, controller state, or a view stack is engine material.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time. The tree drifts (engines merge, buckets flatten); never act on the model above without confirming it against the live folder.
- **Self-contained or it's not done.** Every symbol the change introduces or moves lands inside one engine folder, exported through that engine's barrel, with consumers importing `@/engines/<name>`. No new deep-path imports, no re-export shims.
- **Preserve history on every move.** `git mv` (never delete-then-recreate) so blame survives. Rewrite consumer imports with `perl -pi`/`sed` path swaps, then run `/check-gauntlet` as the punch-list.
- **Stay in the cage.** If a change would make the engine import from `modules/*`, stop and convert to data-injection instead. If it would re-export out through `@/components`/`@/controllers`, stop.
- **Tight, reviewable diff.** During an extraction/migration sweep, **defer polish**: no new engine alignment test, no chasing `modules/shared` doc/tooling leftovers — that's a later cleanup (per the established sweep convention). Update only the CLAUDE.md docs that directly describe the dirs you moved.
- **Schema changes are their own commit. DO NOT COMMIT** — per project CLAUDE.md, you provide a commit message; the user commits.
- **Drive, don't multiple-choice.** The user prefers you drive the design and stick to the plan. Lay out the plan, surface genuine open questions in your response, then execute — don't fragment the work into option prompts.
- **Explicit-only.** Trigger on the literal `/engine`. Not on "the engine is broken", "look at engines", "which engine handles X".

## Step 1 — Ground in the live engine tree

Before classifying the intent, read the current reality:

1. **`ls apps/web/engines/`** — which engines exist right now, and their bucket folders.
2. **The target engine's root `index.ts`** + each relevant bucket's `index.ts` — the actual public surface and how buckets are wired.
3. **`apps/web/components/CLAUDE.md`** — the primitive contract the engine depends inward on (the three-grid model, bucket purposes, the `contracts/`-no-JSX rule, the sanctioned dropdown-cell inversion).
4. **The consumers** — `grep -rl "@/engines/<name>"` across `apps/web/modules/` and `apps/web/app/` to size the blast radius of any barrel/symbol change.
5. **Relevant memory** — `web-engines-convention`, `engine-extraction-sweep-deferrals`, `picker-engine`, `cascade-picker-engine`, `record-view-migration-convention` carry the established conventions and status. Treat them as context, verify against the code.

State what you found in one tight block (engines present, target bucket layout, consumer count) before proposing the change.

## Step 2 — Classify the intent and apply the playbook

Match the user's ask to one of these. They compose — a migration often contains an extraction. **If the whole intent lives inside one engine, hand it to that engine's child** (`/engine-picker`, `/engine-lv`, `/engine-rv`) — it carries the same A–E playbook with that engine's buckets, symbols, and seams already spelled out. Stay in `/engine` when the change crosses engines or touches `common`.

### A. Migrate a module onto an engine
The module gets its detail/list view from the engine. Mirror the engine's canonical folder structure head-to-toe in the module, route to full pages, and build module-local pieces only where the engine genuinely falls short (per `record-view-migration-convention`). Repoint imports to `@/engines/<name>`; delete the bespoke view code the engine now owns.

### B. Extract / pull a misplaced primitive or controller into an engine (the split-brain case)
1. **Find every piece** of the concept across `components/`, `controllers/`, and any module — grep the symbol names, not just the folder.
2. **Decide the home**: a real engine bucket (or a new sub-engine folder with its own `contracts/`) if it carries orchestration; leave it in `components/` if it's a pure primitive and only the *barrel placement* is wrong.
3. **`git mv` the files** into the chosen bucket, consolidating the split halves into one folder.
4. **Wire the barrel** — add `export *` for the new bucket/sub-engine; switch internal references to relative imports.
5. **Rewrite consumers** to `@/engines/<name>` with a path swap; **delete the emptied husk folders**.
6. `/check-gauntlet` until green.

### C. Upgrade / extend an engine
Add to the **right bucket** (types → `contracts/`, controller/hook → `client/`, view → the matching presentation bucket). Keep `contracts/` JSX-free. Export through the bucket barrel so it reaches `@/engines/<name>`. If a feature is becoming independently reusable, promote it to a sub-engine folder; if a sub-namespace has stopped earning its separation, dissolve it back into the shared buckets and fix the barrel.

### D. Fix an engine issue
**Triage engine-vs-consumer first** (that's what the cage is for). If the bug is in the engine, fix it inside the folder and confirm no consumer relied on the broken behavior. If a consumer is misusing the engine (deep import, reaching past data-injection), fix the consumer and, if the misuse was *possible*, tighten the barrel so it can't recur.

### E. Organize within an engine
Bucket hygiene: every file under exactly one bucket; barrels in sync with the tree; relative imports internally; no deep-path leaks from consumers. Flatten sub-namespaces that no longer pull their weight. Keep the public surface minimal.

## Step 3 — Execute and verify

- Make the moves with `git mv`; rewrite importers with a scripted path swap; keep the diff scoped to the move + rewrites + genuinely-dead-code deletion.
- Run **`/check-gauntlet`** (or at minimum the typecheck it wraps) as the punch-list — do not claim green from reading. Report real error counts.
- If you added, migrated, consolidated, or retired an engine, update the **status section of the `web-engines-convention` memory** (and add a focused memory for a brand-new engine, mirroring `picker-engine`) plus its `MEMORY.md` index line.

## Step 4 — Report (per project CLAUDE.md)

- **Headline + counts + TL;DR in the chat**; use a table for the file-by-file detail (what moved where, which barrels changed, consumer count repointed).
- **Open questions go in the response**, not deferred silently — boundary calls ("does this primitive belong in the engine or stay in `components/`?"), sub-engine promote/dissolve decisions, anything genuinely ambiguous.
- **End with a commit message** (schema changes in their own commit) — but **do not commit**.

```
ENGINE — <intent in one line>   (<task type A–E>)

═══ Grounding ═══
Engines: <record-view, list-view, picker>   Target: <name> (<buckets>)   Consumers: <N>

═══ Change ═══
| File / symbol | From | To | Barrel | Consumers repointed |
|---|---|---|---|---|
| ... | components/... | engines/<name>/<bucket>/... | + export | <N> |

═══ Verify ═══
/check-gauntlet: <PASS | N errors>   Husks deleted: <list>   Cage intact: <yes / note>

═══ Open questions ═══
- <boundary / promote-dissolve / ambiguity, or "none">

═══ Commit message ═══
<type(scope): subject + body>
```

## What this skill does NOT do

- Act on the model in this file without re-reading the live `apps/web/engines/` tree first.
- Leave a symbol split across `components/`/`controllers/` + the engine, or re-export engine code back out through `@/components`/`@/controllers`.
- Let an engine import from `modules/*` (convert to data-injection), let a consumer deep-import past the barrel, or let a sibling engine (`picker`/`list-view`/`record-view`) import another (they share only through `common`).
- Re-derive a single engine's detailed model when the whole change lives inside it — hand to `/engine-picker`, `/engine-lv`, or `/engine-rv`; `/engine` keeps the cross-engine and `common` moves.
- Add alignment tests or chase `modules/shared` doc leftovers mid-sweep (deferred polish).
- Commit, or fold a schema change into a non-schema commit.
- Multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/engine` invocation.
