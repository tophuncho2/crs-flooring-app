# flatten-db-areas — collapse the `flooring/` and `management/` area folders inside `packages/db` so every module sits directly under `src/` and `tests/`

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against live code. Trust the code over this file if they disagree — and note the discrepancy in your response.
2. Read the Flags below — open decisions to settle with the user as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Inside `packages/db` only, every module directory currently nested under `src/flooring/` and `src/management/` moves up one level to `src/<module>/`, and the same for the module dirs under `tests/flooring/` and `tests/management/` → `tests/<module>/`. Once emptied, the four area folders (`src/flooring`, `src/management`, `tests/flooring`, `tests/management`) are deleted, and the root barrel plus every relative import that crossed an area boundary is repointed. This is purely mechanical — zero behavior change, NO schema change, no migration.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **`git mv` vs plain move** — prefer `git mv` so history follows each file; confirm the user is fine with that (a plain `mv` + `git add` loses rename tracking on some files).
- ⚑ **Commit granularity** — the tree does NOT typecheck mid-move; it is only green at the whole-operation boundary. Decide up front: one commit for the entire flatten, or a staged sequence that is only verified at the end. DO NOT COMMIT regardless — the user commits.
- ⚑ **Scripted vs manual import rewrite** — a blind global `s#../../#../#` (or `sed`-over-everything) is UNSAFE. It corrupts same-area-sibling imports, intra-module imports, and the varying submodule depths (module-root files escape with `../../`, submodule files escape with `../../../`). Any script MUST be depth-aware / path-anchored (only rewrite imports whose target contains the area segment, and adjust `../` count by the file's depth). Verify each class explicitly.
- ⚑ **The ONE cross-area edge** — `src/flooring/payments/payment-links.ts:1` imports from `../../management/entities/read-repository.js`. This is the only flooring↔management import. It must drop BOTH a `../` AND the `management` area segment → `../entities/read-repository.js`. Do not let a generic rule mangle it.
- ⚑ **`FlooringVacancyStatus` is LEFT ALONE** — it appears at `src/index.ts:1` and in `src/work-orders/read-repository.ts` (post-move path). It is a Prisma MODEL/enum name, NOT a path segment. Model rename is OUT OF SCOPE for this task. Do not touch it.
- ⚑ **Seed-script Prisma model accessors LEFT ALONE** — `scripts` seed files reference `tx.flooringCategory.*` and `tx.flooringUnitOfMeasure.*`. Those are Prisma model accessors, not directory paths. Leave them untouched (rename deferred).
- ⚑ **Verify empty area dirs are removed** — after moving every module out, confirm `src/flooring`, `src/management`, `tests/flooring`, `tests/management` are gone (no stray dotfiles / barrels left behind). Neither area has its own barrel, so they should delete cleanly.

## Scope
**In:** Flatten the two area folders inside `packages/db`. Move every module dir (and its submodules) from `src/flooring/` and `src/management/` up to `src/`, and every module test dir from `tests/flooring/` and `tests/management/` up to `tests/`. Fix the root barrel `src/index.ts`, fix every relative import that escapes a module and crosses the (now-removed) area segment, fix the one cross-area edge, fix the test imports, and delete the four empty area dirs.

**Out:** Anything outside `packages/db`. The `prisma/` dir (schema + migrations) — the Flooring MODEL rename is deferred and NOT part of this task. `src/generated/` internals. The `shared/`, `queues/`, and `seed/` AREA folders themselves (they stay put; only the `flooring`/`management` module dirs move). `dist/`. No schema change, no migration.

## Files you own (do not edit anything outside packages/db)
- All module dirs under `src/flooring/` and `src/management/` (source + their submodules) — moving up one level.
- All module test dirs under `tests/flooring/` and `tests/management/` — moving up one level.
- `src/index.ts` — the root barrel, repointed.
Everything inside `packages/db` is yours to move/edit EXCEPT `prisma/` and `src/generated/`, which you must NOT touch. Config files (`tsconfig.json`, `vitest.config.ts`, `package.json`) need NO changes (see Execution map §6).

> Convention reminder: this package uses NodeNext — EVERY relative import carries an explicit `.js` extension. Preserve it on every rewrite.

## Execution map

### (1) Move list — 16 src dirs (incl. submodules) + 8 test dirs. No collisions.
`src/flooring/ → src/`:
- `categories`
- `imports` (submodules: `staged-inventory-filter-rows`, `staged-inventory-rows`, `staged-inventory-section`)
- `inventory` (submodule: `adjustments`)
- `payments`
- `products`
- `unit-of-measures`
- `warehouses`
- `work-orders` (submodule: `material-items`)

`src/management/ → src/`:
- `entities`
- `entity-types`
- `invites`
- `job-types`
- `properties`
- `templates` (submodule: `planned-products`)
- `user-activity`
- `users`

`tests/flooring/ → tests/`: `inventory` (submodule `adjustments`), `unit-of-measures`, `work-orders`.
`tests/management/ → tests/`: `invites`, `properties`, `templates`, `user-activity`, `users`.

**No-collision confirmation.** After the moves `src/` retains: `client.ts`, `env.ts`, `errors.ts`, `generated/`, `index.ts`, `mutation-receipts.ts`, `queues/`, `seed/`, `shared/`, `types.ts` — no module name collides with any of these. `tests/` root currently holds ONLY `flooring/` and `management/`, so no test-dir collision either.

### (2) Root barrel — `src/index.ts`. Drop the area segment on L6–L21 (L6 & L10 point at `read-repository.js` directly, not `index.js`):
- L6 `./flooring/categories/read-repository.js` → `./categories/read-repository.js`
- L7 `./flooring/imports/index.js` → `./imports/index.js`
- L8 `./flooring/inventory/index.js` → `./inventory/index.js`
- L9 `./flooring/payments/index.js` → `./payments/index.js`
- L10 `./flooring/unit-of-measures/read-repository.js` → `./unit-of-measures/read-repository.js`
- L11 `./flooring/products/index.js` → `./products/index.js`
- L12 `./flooring/warehouses/index.js` → `./warehouses/index.js`
- L13 `./flooring/work-orders/index.js` → `./work-orders/index.js`
- L14 `./management/entities/index.js` → `./entities/index.js`
- L15 `./management/properties/index.js` → `./properties/index.js`
- L16 `./management/job-types/index.js` → `./job-types/index.js`
- L17 `./management/entity-types/index.js` → `./entity-types/index.js`
- L18 `./management/templates/index.js` → `./templates/index.js`
- L19 `./management/users/index.js` → `./users/index.js`
- L20 `./management/invites/index.js` → `./invites/index.js`
- L21 `./management/user-activity/index.js` → `./user-activity/index.js`

**DO NOT TOUCH:** L1 `export { Prisma, UserRank, FlooringVacancyStatus } from "./generated/prisma/client.js"` — `FlooringVacancyStatus` is a MODEL/enum name, not a path (rename out of scope). L2–L5 and L22–L25 are unaffected.

### (3) Escaping imports (src) — depth-class RULE
The rule: **drop one `../`, and drop the area segment if the path contains one.** Depth is uniform per level — module-root files escape with `../../`, submodule files escape with `../../../`.

**3a. Module-root files `../../X` → `../X`** (refs to `client.js`, `generated/prisma/client.js`, `shared/number-neighbors.js`) — post-move paths:
`categories/read-repository.ts:1,2`; `imports/read-repository.ts:2,3,4`; `imports/shared.ts:1`; `imports/write-repository.ts:2,3`; `inventory/order-by.ts:1`; `inventory/shared.ts:1`; `inventory/read-repository.ts:15,16,17`; `inventory/write-repository.ts:1,3`; `payments/read-repository.ts:1,2,4`; `payments/write-repository.ts:1,3`; `payments/payment-links.ts:2` (see 3c for :1); `products/read-repository.ts:1,2,17`; `products/shared.ts:1`; `products/write-repository.ts:2,3`; `unit-of-measures/read-repository.ts:1,2`; `warehouses/read-repository.ts:8,9,10`; `warehouses/shared.ts:1`; `warehouses/write-repository.ts:2,3`; `work-orders/shared.ts:1`; `work-orders/order-by.ts:1`; `work-orders/read-repository.ts:1,2,3`; `work-orders/write-repository.ts:1,2`; `entities/read-repository.ts:1,2,3,14`; `entities/write-repository.ts:1,2`; `entity-types/read-repository.ts:1,2,3`; `entity-types/write-repository.ts:1,2`; `invites/read-repository.ts:1,2`; `invites/write-repository.ts:1,2`; `job-types/read-repository.ts:1,2,3`; `job-types/write-repository.ts:1,2`; `properties/order-by.ts:1`; `properties/read-repository.ts:1,2,3,14`; `properties/write-repository.ts:1,2`; `templates/order-by.ts:1`; `templates/read-repository.ts:1,2,4`; `templates/write-repository.ts:1,2`; `user-activity/read-repository.ts:1,2`; `users/read-repository.ts:1,2`; `users/write-repository.ts:1,2`.

**3b. Submodule files `../../../X` → `../../X`** (client/generated only) — post-move paths:
`work-orders/material-items/read-repository.ts:1,2`; `work-orders/material-items/write-repository.ts:1,2`; `imports/staged-inventory-filter-rows/read-repository.ts:6`; `imports/staged-inventory-filter-rows/write-repository.ts:1,2`; `imports/staged-inventory-filter-rows/shared.ts:1`; `imports/staged-inventory-rows/read-repository.ts:1,4`; `imports/staged-inventory-rows/shared.ts:1`; `imports/staged-inventory-rows/write-repository.ts:1,2`; `imports/staged-inventory-section/read-repository.ts:2`; `imports/staged-inventory-section/write-repository.ts:1`; `inventory/adjustments/order-by.ts:1`; `inventory/adjustments/read-repository.ts:1,11`; `inventory/adjustments/locks.ts:1`; `inventory/adjustments/shared.ts:1`; `inventory/adjustments/write-repository.ts:1`; `templates/planned-products/read-repository.ts:1,2`; `templates/planned-products/write-repository.ts:1,2`.

**3c. CROSS-AREA (both endpoints move) — THE ONLY flooring↔management edge:**
`src/payments/payment-links.ts:1` (pre-move `src/flooring/payments/payment-links.ts:1`) `import { entityTypesSelect } from "../../management/entities/read-repository.js"` → `"../entities/read-repository.js"`. It loses the `../` AND drops `management`.

**UNAFFECTED — do NOT change** (same-area-sibling or intra-module; no area segment crossed):
- `products/read-repository.ts:7` `"../categories/read-repository.js"` (same-area sibling — already correct post-move)
- `imports/staged-inventory-section/write-repository.ts:5,9,13,17` (intra-module `../staged-inventory-*`)
- `imports/staged-inventory-section/read-repository.ts:3` `"../staged-inventory-rows/shared.js"` (intra-module)
- `inventory/adjustments/order-by.ts:2` `"../order-by.js"` (intra-module)

### (4) Escaping imports (tests) — RULE: `../../../src/<area>/<module>/` → `../../src/<module>/` (drop one `../` + drop the area segment). Submodule test drops one more level (4 `../` → 3).
Sites (post-move paths): `tests/user-activity/read-repository.test.ts:2`; `tests/users/write-repository.test.ts:6`; `tests/properties/order-by.test.ts:5`; `tests/templates/order-by.test.ts:5`; `tests/invites/read-repository.test.ts:5`; `tests/invites/write-repository.test.ts:6`; `tests/work-orders/order-by.test.ts:5`; `tests/unit-of-measures/read-repository.test.ts:2`; `tests/inventory/order-by.test.ts:5`; `tests/inventory/adjustments/order-by.test.ts:5` (SUBMODULE: `../../../../src/flooring/inventory/adjustments/order-by.js` → `../../../src/inventory/adjustments/order-by.js`). Line 1 (the `vitest` import) is unaffected in every test file.

### (5) UNAFFECTED do-not-touch list (recap)
- Prisma model accessors, not paths: `FlooringVacancyStatus` (`src/index.ts:1`, `work-orders/read-repository.ts`); seed scripts `tx.flooringCategory.*` (`scripts/seed-categories.js:75,83`) and `tx.flooringUnitOfMeasure.*` (`scripts/seed-unit-of-measures.js:63,69,75`).
- Same-area-sibling + intra-module imports listed in §3c UNAFFECTED.
- `prisma/`, `src/generated/`, `shared/`, `queues/`, `seed/`, `client.ts`, `types.ts`, `errors.ts`, `env.ts`, `mutation-receipts.ts` — no reverse importers into a module dir; nothing to change.

### (6) Config = NO changes
- `tsconfig.json` — `rootDir src`, `include src/**/*.ts` (glob-based; module depth is irrelevant).
- `vitest.config.ts` — `include tests/**/*.test.ts` (glob-based).
- `package.json` — `exports` point at `dist` only; external consumers import via the `@builders/db` barrel, not deep paths.
- Seed scripts contain MODEL accessors, not path segments — leave them (see §5).
- No dynamic `import()` / `require` anywhere in the package; no reverse importers from `shared`/`queues`/`seed`/`client`/`types`/`errors`/`env`/`mutation-receipts` into a module. The "drop one `../`, drop the area segment if present" rule holds 100%.

## Migration
None — this task makes NO schema change and writes NO migration. The `prisma/` dir is untouched.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test) — run AFTER the whole move + rewrite completes. The tree will NOT typecheck mid-move, so do not run it until every file has moved and every import is repointed.
- Beware the stale-dist trap: do a CLEAN build before trusting typecheck (a leftover `dist/` from before the move can mask or fake errors).
- Empty area dirs (`src/flooring`, `src/management`, `tests/flooring`, `tests/management`) confirmed deleted.
- Commit message ≤17 words ready. DO NOT COMMIT — the user commits.
