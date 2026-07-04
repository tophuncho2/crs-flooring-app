# flatten-domain-areas — collapse the `flooring/` and `management/` area folders in `packages/domain`, promoting every module dir up one level

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against live code. Trust the code over this file if they disagree — and note the discrepancy in your response.
2. Read the Flags below — open decisions to settle with the user as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Inside `packages/domain` only, the `src/flooring/` and `src/management/` folders are pure organizational wrappers with no code of their own — every child is a self-contained module dir. "Done" means: each module dir under `packages/domain/src/{flooring,management}/` is moved up to `packages/domain/src/<module>/`, the same is done for the corresponding dirs under `tests/`, the two now-empty area dirs (and their `tests/` counterparts) are deleted, and every internal import that crossed an area boundary — the root barrel, the escaping module imports, the test imports, and the ONE staying-file import — is rewritten to match. This is purely mechanical: zero behavior change, zero schema change, zero migration. `/check-gauntlet` must be green when finished.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **git-mv vs plain move.** Prefer `git mv` so history follows each dir. Confirm the user is fine with the resulting rename churn, or wants a plain move.
- ⚑ **Commit granularity.** One commit for the whole flatten vs one commit per module dir. Recommend ONE commit — the tree does not typecheck mid-move, so per-module commits would each be red. Settle before executing. (Reminder: DO NOT COMMIT — the user commits.)
- ⚑ **Import rewrite: scripted vs hand-edited.** A blind global `../../` → `../` (or "rewrite every `../` import") is UNSAFE — it would corrupt intra-module `./` imports, same-area cross-module `../<module>/` imports that must stay, and the varying test depths. Only the imports enumerated in the Execution map change. If you script it, make the script depth-aware and path-scoped, and diff the result against the cite lists below.
- ⚑ **The one edit outside the moved trees.** `src/queue/materialize-import-batch.ts` STAYS PUT but imports into a moving module — it must be edited (drop the `flooring/` segment, keep the `../` count). Easy to miss. Confirm it's included.
- ⚑ **Empty area dirs.** After the moves, explicitly confirm `src/flooring/`, `src/management/`, `tests/flooring/`, and `tests/management/` are removed (git won't track empty dirs, but stray files/`.DS_Store` can linger).

## Scope
In: Flatten the two area folders inside `packages/domain`. Move the 16 `src/` module dirs and 11 `tests/` module dirs up one level. Fix the root barrel (`src/index.ts`), the escaping cross-boundary imports in the moved `src/` files, the escaping imports in the moved `tests/` files, and the one staying-file import in `src/queue/`. Delete the emptied area dirs.
Out: Anything outside `packages/domain`. The Prisma schema / any model or column rename. The `shared/` and `queue/` AREA folders themselves — they stay put; only the module dirs move. `dist/` (build output — do not hand-edit; a clean build regenerates it).

## Files you own (do not edit anything outside packages/domain)
Everything inside `packages/domain` is yours; nothing outside is. Concretely:
- The 16 `src/` module dirs and 11 `tests/` module dirs being moved (see move list).
- `src/index.ts` (the root barrel).
- `src/queue/materialize-import-batch.ts` — the ONE staying file that imports into a moving module.
Do NOT touch config (`tsconfig.json`, `vitest.config.ts`, `package.json`) — verified no area segment appears in any of them.

## Execution map

### 1. Move list (no collisions)
**src/ module dirs — move up one level (16 dirs):**
- From `src/flooring/` → `src/`: `categories`, `imports`, `inventory`, `payments`, `products`, `unit-of-measures`, `warehouses`, `work-orders`.
- From `src/management/` → `src/`: `entities`, `entity-types`, `invites`, `job-types`, `properties`, `templates`, `user-activity`, `users`.
- Then delete empty `src/flooring/` and `src/management/`.

**tests/ module dirs — move up one level (11 dirs):**
- From `tests/flooring/` → `tests/`: `imports`, `inventory`, `payments`, `warehouses`, `work-orders`.
- From `tests/management/` → `tests/`: `entities`, `invites`, `job-types`, `properties`, `templates`, `users`.
- Then delete empty `tests/flooring/` and `tests/management/`.

NOTE: `tests/` has FEWER dirs than `src/` — there are no test dirs for `categories`, `products`, `unit-of-measures`, `entity-types`, `user-activity`. This asymmetry is expected; do not go looking for the missing five.

**Collision check — NONE.** Loose siblings that stay in `src/`: `index.ts`, `queue/`, `shared/`. Loose siblings that stay in `tests/`: `queue/`, `shared/`. No moved module name collides with an existing top-level dir.

### 2. Root barrel edits — `src/index.ts` (drop the area segment on 16 lines)
Management block (drop `management/`):
- `index.ts:9` `./management/entities/index.js` → `./entities/index.js`
- `index.ts:10` `./management/properties/index.js` → `./properties/index.js`
- `index.ts:11` `./management/job-types/index.js` → `./job-types/index.js`
- `index.ts:12` `./management/entity-types/index.js` → `./entity-types/index.js`
- `index.ts:13` `./management/templates/index.js` → `./templates/index.js`
- `index.ts:14` `./management/users/index.js` → `./users/index.js`
- `index.ts:15` `./management/invites/index.js` → `./invites/index.js`
- `index.ts:16` `./management/user-activity/index.js` → `./user-activity/index.js`

Flooring block (drop `flooring/`):
- `index.ts:28` `./flooring/categories/index.js` → `./categories/index.js`
- `index.ts:29` `./flooring/imports/index.js` → `./imports/index.js`
- `index.ts:30` `./flooring/inventory/index.js` → `./inventory/index.js`
- `index.ts:31` `./flooring/unit-of-measures/index.js` → `./unit-of-measures/index.js`
- `index.ts:32` `./flooring/payments/index.js` → `./payments/index.js`
- `index.ts:33` `./flooring/products/index.js` → `./products/index.js`
- `index.ts:34` `./flooring/warehouses/index.js` → `./warehouses/index.js`
- `index.ts:35` `./flooring/work-orders/index.js` → `./work-orders/index.js`

Lines 1-8 (`./queue/*`, `./shared/*`) and 17-27 (`./shared/*`) are UNAFFECTED. The barrel interleaves shared/queue exports between the two blocks — no reordering needed, just edit the 16 lines in place.

### 3. Escaping relative imports (src) — RULE: drop exactly one `../`
Each moved module climbs one fewer level to reach `shared/` (or a cross-area sibling). The rule is "drop exactly one `../`", but ONLY on the imports listed here — see the UNAFFECTED list, which must NOT be rewritten.

**3a. CROSS-AREA special case (both endpoints move) — `flooring/payments` → `management/entities`.** These lose the `../../management/` entirely because both dirs land as top-level siblings:
- `src/flooring/payments/normalizers.ts:3` `"../../management/entities/types.js"` → `"../entities/types.js"`
- `src/flooring/payments/types.ts:1` `"../../management/entities/types.js"` → `"../entities/types.js"`

**3b. Escapes to `shared/` from a module-root file (`../../shared/` → `../shared/`):**
- `src/flooring/payments/normalizers.ts:1` (money), `:2` (palette)
- `src/flooring/payments/signed-amount.ts:1` (money)
- `src/flooring/payments/form-rules.ts:1` (money)
- `src/flooring/payments/types.ts:2` (palette)
- `src/flooring/work-orders/types.ts:1` (palette)
- `src/flooring/work-orders/form-rules.ts:1` (date-format)
- `src/flooring/work-orders/export-columns.ts:1` (csv), `:2` (date-format)
- `src/flooring/work-orders/normalizers.ts:1` (palette)
- `src/flooring/products/types.ts:7` (palette)
- `src/flooring/imports/types.ts:1` (palette)
- `src/flooring/inventory/create-rules.ts:1` (money)
- `src/flooring/inventory/types.ts:7` (palette)
- `src/flooring/inventory/formatters.ts:1` (money)
- `src/flooring/inventory/export-columns.ts:1` (csv), `:2` (date-format)
- `src/management/entity-types/normalizers.ts:2` (palette)
- `src/management/entity-types/types.ts:1` (palette)
- `src/management/entity-types/form-rules.ts:5` (palette)
- `src/management/properties/form-rules.ts:1` (name-rules)
- `src/management/properties/property-hub-form.ts:3` (name-rules)
- `src/management/properties/types.ts:1` (palette)
- `src/management/properties/normalizers.ts:1` (address/index), `:2` (phone), `:3` (palette)
- `src/management/templates/normalizers.ts:1` (palette)
- `src/management/templates/types.ts:1` (palette)
- `src/management/entities/normalizers.ts:1` (address/index), `:2` (palette), `:3` (phone)
- `src/management/entities/types.ts:1` (palette)
- `src/management/entities/form-rules.ts:1` (name-rules)

All drop one `../`.

**3c. Nested subdir → `shared/` (`../../../shared/` → `../../shared/`):**
- `src/flooring/work-orders/material-items/diff-rules.ts:1` (section-diff)
- `src/flooring/work-orders/file-generation/work-order-document-sections.ts:1` (address/index), `:2` (phone)
- `src/flooring/imports/staged-inventory-rows/form-rules.ts:1` (money)
- `src/flooring/inventory/adjustments/types.ts:1` (palette)
- `src/flooring/inventory/adjustments/export-columns.ts:1` (csv), `:2` (date-format)
- `src/management/templates/planned-products/diff-rules.ts:1` (section-diff)

**3d. Doubly-nested → `shared/` (`../../../../shared/` → `../../../shared/`):**
- `src/flooring/imports/staged-inventory-filter-rows/diff/types.ts:1` (section-diff)

**UNAFFECTED — do NOT touch (these are traps for a blind rewrite):**
- Any intra-module `./` import.
- Same-area cross-module single-`../<module>/` imports (both stay siblings, so the `../` count is unchanged):
  - `src/management/properties/property-hub-form.ts:1` `"../entities/types.js"`, `:2` `"../entities/form-rules.js"`
  - `src/management/invites/types.ts:2` `"../users/rank.js"`
  - `src/management/invites/invite-rules.ts:1` `"../users/rank.js"`
  - `src/management/invites/normalizers.ts:1` `"../users/rank.js"`
- Intra-module nested single-`../` imports (stay within the same moving module, so relative distance is preserved):
  - `src/flooring/work-orders/file-generation/work-order-document-sections.ts:3` `"../material-items/adjustment-quantities.js"`
  - `src/flooring/imports/staged-inventory-rows/diff/types.ts:1,2` `"../types.js"`
  - `src/flooring/imports/staged-inventory-rows/diff/rules.ts:1` `"../editability.js"`
  - `src/flooring/imports/staged-inventory-filter-rows/diff/types.ts:2` `"../types.js"`
  - `src/flooring/imports/staged-inventory-section/types.ts:1,2`
  - `src/flooring/inventory/adjustments/{rules/*, math/*, export-columns.ts:6}`

### 4. Escaping relative imports (tests) — RULE: drop one `../` AND drop the area segment
A test at `.../src/flooring/...` becomes `.../src/...` — the `flooring/`/`management/` segment disappears and one `../` is dropped. Depth classes:

**Depth-3 tests (`../../../src/<area>/` → `../../src/`):**
- `tests/flooring/payments/signed-amount.test.ts:5`
- `tests/flooring/payments/normalizers.test.ts:2`
- `tests/flooring/work-orders/normalizers.test.ts:5`
- `tests/flooring/work-orders/form-rules.test.ts:2,3`
- `tests/flooring/work-orders/export-columns.test.ts:2,3`
- `tests/flooring/warehouses/warehouse-rules.test.ts:7`
- `tests/flooring/warehouses/types.test.ts:6`
- `tests/flooring/imports/form-rules.test.ts:2,6,7`
- `tests/flooring/inventory/computed.test.ts:5`
- `tests/flooring/inventory/formatters.test.ts:7`
- `tests/flooring/inventory/delete-rules.test.ts:5`
- `tests/flooring/inventory/create-rules.test.ts:7`
- `tests/management/job-types/form-rules.test.ts:2,3`
- `tests/management/job-types/normalizers.test.ts:5`
- `tests/management/properties/property-hub-form.test.ts:7,12,13`
- `tests/management/properties/normalizers.test.ts:6`
- `tests/management/properties/form-rules.test.ts:5,9`
- `tests/management/properties/delete-rules.test.ts:5`
- `tests/management/users/rank.test.ts:6`
- `tests/management/templates/form-rules.test.ts:2,3`
- `tests/management/templates/normalizers.test.ts:5`
- `tests/management/entities/form-rules.test.ts:5,9`
- `tests/management/entities/normalizers.test.ts:6`
- `tests/management/invites/invite-rules.test.ts:2`

**Depth-4 tests (`../../../../src/<area>/` → `../../../src/`):**
- `tests/flooring/work-orders/file-generation/header.test.ts:2`
- `tests/flooring/work-orders/file-generation/adjustments-picking-ticket.test.ts:2,3,4`
- `tests/flooring/work-orders/file-generation/_fixtures.ts:7`
- `tests/flooring/work-orders/file-generation/print-config.test.ts:2,6,11`
- `tests/flooring/work-orders/file-generation/plan-file.test.ts:2,3,7`
- `tests/flooring/work-orders/file-generation/adjustments-shared.test.ts:2,3,4`
- `tests/flooring/work-orders/file-generation/adjustments-slip.test.ts:2,3,4`
- `tests/flooring/work-orders/file-generation/work-order-info.test.ts:2`
- `tests/flooring/work-orders/file-generation/above-table-invariant.test.ts:2,3`
- `tests/flooring/imports/staged-inventory-rows/form-rules.test.ts:2,8,9`
- `tests/flooring/imports/staged-inventory-rows/editability.test.ts:12`
- `tests/flooring/imports/staged-inventory-rows/import-batch-rules.test.ts:7,8`
- `tests/flooring/imports/staged-inventory-filter-rows/form-rules.test.ts:2,7`
- `tests/flooring/inventory/adjustments/money.test.ts:2`
- `tests/flooring/inventory/adjustments/rules.test.ts:5,6,10`
- `tests/flooring/inventory/adjustments/math.test.ts:7,8`
- `tests/flooring/inventory/adjustments/export-columns.test.ts:2,3`
- `tests/flooring/inventory/adjustments/sort.test.ts:2`

**Depth-5 test (`../../../../../src/flooring/` → `../../../../src/`):**
- `tests/flooring/imports/staged-inventory-rows/diff/rules.test.ts:2,6`

### 5. The STAYING queue file — the one edit outside the moved trees (GOTCHA)
- `src/queue/materialize-import-batch.ts:2` `import { MAX_MARK_FOR_IMPORT_ROWS } from "../flooring/imports/staged-inventory-rows/import-batch-rules.js"` → `"../imports/staged-inventory-rows/import-batch-rules.js"`.
- DROP the `flooring/` segment ONLY. The `../` count is UNCHANGED — this file stays in `src/queue/`, so it still climbs one level to reach `src/`, then descends into the (now top-level) `imports/` module. This is the single import edit that lives outside the moving dirs and is trivially missed; it IS in scope.

### 6. Cross-cutting rules
- Every import uses an explicit `.js` extension (NodeNext/ESM) — preserve it on every rewrite; do not strip or add it.
- No dynamic `import()` or computed paths exist. The barrel (`src/index.ts`) is the only public surface; external consumers import `@builders/domain`, never deep paths — so no consumer outside `packages/domain` needs touching.
- Config = NO changes. `tsconfig.json` (`rootDir: src`, `include: src/**/*.ts`), `vitest.config.ts` (`include: tests/**/*.test.ts`), and `package.json` (dist barrel only) contain no area segment.
- Do a CLEAN build to avoid the stale-`dist/` typecheck trap (old compiled paths lingering after the move).

## Migration
None — this task makes NO schema change and writes NO migration.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test) — run AFTER the whole move + rewrite is complete. The tree will NOT typecheck mid-move, so do not gate on intermediate green.
- Confirm the four area dirs (`src/flooring/`, `src/management/`, `tests/flooring/`, `tests/management/`) are gone.
- Commit message ≤17 words ready. DO NOT COMMIT — the user commits.
