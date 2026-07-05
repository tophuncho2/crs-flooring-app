 HANDOFF — Execute the warehouse → Store full-rename (drop Flooring prefix, zero behavior change)

  ## Context
  Picking up an APPROVED, fully-researched full rename of the warehouse module → `Store`. All
  scoping/research is done and decisions are settled; NO code has been written yet. The task is
  gated: the user is merging the dev-family (dev-1..3) right now. DO NOT start editing until the
  user explicitly says "clear to go". When they do, re-validate scope against the freshly-merged
  code first (the merge may have shifted line numbers / added warehouse refs), then execute.

  ## Done
  - [x] Full backend + frontend surface inventoried end-to-end
  (schema→domain→data→application→worker→api→module→pages→nav→tests)
  - [x] Approved plan + canonical symbol map + file inventory written to
  `.claude/work-trees/dev-3/i-have-a-task-dynamic-sprout.md`
  - [x] Decisions settled with user (see below) — no open questions on scope
  - [x] Live Postgres FK/index/constraint/sequence names verified against current schema (see Key facts)
  - [x] Confirmed 5 live FK-owning tables; history-only tables (flooring_cut_log / _location / _section /
  staged-row warehouseId) correctly EXCLUDED
  - [x] One trial schema edit was made then DISCARDED by user — tree is clean, no migration folder exists

  ## Build state
  Skipped — no code touched this session (schema edit discarded, working tree clean). Also, user is
  mid-merge on the dev-family, so a gauntlet run would measure an unstable tree. Run `npm run check`
  (or `/check-gauntlet`) as the final verify AFTER executing the rename.

  ## Open / next
  - [ ] WAIT for user's "clear to go" (dev-family merge in flight) — do not edit before then
  - [ ] Invoke `/full-rename` (the designated executor) — it drives git-mv + symbol-map +
  build-before-typecheck
  - [ ] Re-run the Step-1 validation grep against post-merge code; reconcile any drift vs the saved
  inventory
  - [ ] Execute layer cascade: schema → migration (author, DON'T run) → db:generate → domain → data →
  application → barrels → api → module → pages → nav/pdf → cross-module → tests
  - [ ] Author the pure-rename SQL migration
  `packages/db/prisma/migrations/<ts>_rename_warehouse_to_store/migration.sql` (names below); user runs
  `db:deploy`
  - [ ] Final verify: build → typecheck → lint → test green + straggler grep returns ZERO warehouse
  tokens (outside historical migrations)

  ## Watch out
  - Settled decisions (drive these, don't re-ask): FULL physical DB rename · routes
  `/dashboard/warehouse`→`/dashboard/store` + `/api/warehouses`→`/api/stores` · query param
  `?warehouseId=`→`?storeId=` · nav slug `flooring-warehouse`→`store` · error codes
  `WAREHOUSE_*`→`STORE_*` · telemetry entityType `flooringWarehouse`→`store` · lucide glyph→`Store` ·
  DELETE dead `formatWarehouseLabel` (packages/domain/src/shared/numbering.ts)
  - Model becomes bare `Store` (no Flooring prefix); table `@@map("store")`. STORE- number prefix +
  `SUBSTRING(... FROM 7)` are UNCHANGED — displayed values stay `STORE-N`.
  - Migration is AUTHORED by Claude but RUN by the user (`db:deploy`). dev-1..3 SHARE dev's DB — a
  sibling may already have applied it; coordinate the run.
  - NEVER edit historical migration files; exclude `/generated/`, `/dist/`, `/.next/`, `*.tsbuildinfo`,
  historical migrations from grep sweeps.
  - Build packages (`npm run build` / `db:generate`) BEFORE cross-package typecheck to avoid stale-dist
  phantom errors.
  - DO NOT COMMIT (user commits); provide a ≤17-word commit message at the end.
  - Old bookmarks to `/dashboard/warehouse`, `/api/warehouses`, `?warehouseId=` will 404/no-op — this is
  BY DESIGN (user chose full path+param rename).

  ## Key facts — verified live DB identifiers for the migration
  Store table (rename `flooring_warehouse`→`store`): pkey `flooring_warehouse_pkey`→`store_pkey`;
  uniques `flooring_warehouse_name_key`→`store_name_key`,
  `flooring_warehouse_warehouse_number_key`→`store_store_number_key`;
  indexes `flooring_warehouse_warehouse_number_idx`→`store_store_number_idx`,
  `flooring_warehouse_warehouseNumberInt_idx`→`store_storeNumberInt_idx`;
  sequence `flooring_warehouse_number_seq`→`store_number_seq`; columns `warehouse_number`→`store_number`,
  `warehouseNumberInt`→`storeNumberInt` (generated col tracks source by attnum — rename is safe).
  5 FK-owning tables — `warehouseId`→`storeId`, `<t>_warehouseId_fkey`→`<t>_storeId_fkey`,
  `<t>_warehouseId_idx`→`<t>_storeId_idx`:
    · `flooring_inventory` (+composite
  `flooring_inventory_warehouseId_location_id_idx`→`..._storeId_location_id_idx`)
    · `flooring_import_entry`
    · `flooring_inventory_adjustment` (+composite
  `flooring_inventory_adjustment_warehouseId_createdAt_id_idx`→`..._storeId_createdAt_id_idx`)
    · `template`  · `flooring_work_order`
  Template migration to copy style/prefix logic from: `20260622140000_warehouse_store_number` +
  `..140100_..generated_column`.

  ## Key files
  - `.claude/work-trees/dev-3/i-have-a-task-dynamic-sprout.md` — the approved plan, full symbol map,
  directory-rename list, per-layer file inventory. START HERE.
  - `packages/db/prisma/schema.prisma` — `Store` model + 5 FK sites (inventory 311, import_entry 411,
  adjustment 454, template 558, work_order 647; pre-merge line #s — re-confirm)
  - `packages/application/src/imports/staged-inventory-rows/materialize-imported-rows.ts` — worker path;
  `storeId: row.importEntry.storeId`
  - Barrels to retarget: `packages/{domain,application,db}/src/index.ts`
  (`./warehouses/index.js`→`./stores/index.js`)
  - `apps/web/modules/app-shell/navigation/definitions.ts` + `nav-rail.tsx` — nav slug/name/href + lucide
  glyph
  ```
