# Docs Index

Three checklists: every skill, every `CLAUDE.md`, and every other `.md` in the repo (node_modules excluded).

## 1 · Skills (`.claude/skills/*/SKILL.md`)

- [ ] auth-ops
- [ ] check
- [ ] column-actor
- [ ] column-color
- [ ] column-new-index
- [ ] column-new-string
- [ ] column-rownumber
- [ ] column-sort
- [ ] column-timestamp
- [ ] dev-sync
- [ ] diff-merge
- [ ] dig
- [ ] dispatch
- [ ] dispatch-begin
- [ ] engine
- [ ] entity-picker
- [ ] full-rename
- [ ] newskill
- [ ] quick-report
- [ ] quick-task
- [ ] session-confirm
- [ ] session-handoff
- [ ] session-new
- [ ] table-csv-export
- [ ] whattests

## 2 · `CLAUDE.md` files

- [ ] CLAUDE.md
- [ ] apps/web/CLAUDE.md
- [ ] apps/web/app/CLAUDE.md
- [ ] apps/web/modules/CLAUDE.md
- [ ] apps/web/server/CLAUDE.md
- [ ] docs/architecture/CLAUDE.md
- [ ] packages/CLAUDE.md
- [ ] packages/application/CLAUDE.md
- [ ] packages/db/CLAUDE.md
- [ ] packages/domain/CLAUDE.md
- [ ] packages/pdf/CLAUDE.md

## 3 · Other `.md` files (non-`CLAUDE.md`, non-`SKILL.md`)

### `.claude/`
- [ ] .claude/AUTH-OPS/Auth.md
- [ ] .claude/BAD-HABBITS.md
- [ ] .claude/Work-tree-explanation.md
- [ ] .claude/DEVELOPER-PLANS/0-TO-DO-DRAFTS.md
- [ ] .claude/DEVELOPER-PLANS/1-ENTITY-PAYMENTS.md
- [ ] .claude/DEVELOPER-PLANS/2-PRODUCT-UOM.md
- [ ] .claude/DEVELOPER-PLANS/AUTH_REDESIGN.md
- [ ] .claude/DEVELOPER-PLANS/USER-RANKS.md
- [ ] .claude/DISPATCH/.claude/work-trees/dev/bubbly-snacking-raven.md
- [ ] .claude/DISPATCH/adjustments-list-actionbar.md
- [ ] .claude/DISPATCH/dev-1-row-search-into-menu-wo-inventory.md
- [ ] .claude/DISPATCH/dev-2-row-search-into-menu-properties-imports.md
- [ ] .claude/DISPATCH/dev-3-row-search-into-menu-products-adjustments.md
- [ ] .claude/DISPATCH/dev-4-row-search-into-menu-jobtypes-entitytypes-warehouse.md
- [ ] .claude/DISPATCH/dev-4-users-activity-and-cross-branch-awareness.md
- [ ] .claude/DISPATCH/entities-list-actionbar.md
- [ ] .claude/DISPATCH/list-table-options-sort.md
- [ ] .claude/DISPATCH/list-view-toolbar-engine-primitive.md
- [ ] .claude/DISPATCH/payments-link-work-orders-entities.md
- [ ] .claude/DISPATCH/record-view-page-break.md
- [ ] .claude/DISPATCH/unit-of-measures-list-standard.md
- [ ] .claude/work-trees/dev/floating-crunching-cake.md
- [ ] .claude/work-trees/dev/handoff-wo-adjustments-playful-dragon.md
- [ ] .claude/work-trees/dev/i-neec-this-enchanted-pike.md
- [ ] .claude/work-trees/dev/i-need-to-open-silly-unicorn.md
- [ ] .claude/work-trees/dev/in-the-work-merry-wadler.md
- [ ] .claude/work-trees/dev/in-this-branch-were-jazzy-popcorn.md
- [ ] .claude/work-trees/dev/run-deep-search-im-compressed-canyon.md
- [ ] .claude/work-trees/dev/sorted-wibbling-zebra.md
- [ ] .claude/work-trees/dev/unified-wondering-teacup.md
- [ ] .claude/work-trees/dev/we-will-come-stateful-origami.md

### `docs/`
- [ ] docs/architecture/deployment/relay.md
- [ ] docs/architecture/deployment/web.md
- [ ] docs/architecture/deployment/worker.md
- [ ] docs/architecture/directories/1_schema/1_schema.md
- [ ] docs/architecture/directories/2_domain/2_domain.md
- [ ] docs/architecture/directories/3_data/3_data.md
- [ ] docs/architecture/directories/4.5_async/outbox.md
- [ ] docs/architecture/directories/4.5_async/relay.md
- [ ] docs/architecture/directories/4.5_async/worker.md
- [ ] docs/architecture/directories/4_application/4_application.md
- [ ] docs/architecture/directories/5_api_routes/5_api_routes.md
- [ ] docs/architecture/directories/6_modules_directory/6_modules_directory.md
- [ ] docs/architecture/directories/7_dashboard_loaders/7_dashboard_loaders.md
- [ ] docs/architecture/gauntlet/.gitkeep.md

### Package & app READMEs / docs
- [ ] README.md
- [ ] apps/relay/README.md
- [ ] apps/worker/README.md
- [ ] packages/db/DATABASE.md
- [ ] packages/domain/BUSINESS-LOGIC.md

## 4 · Terminal Commands

System-specific first. The user always runs migrations and always commits — Claude never does either unless explicitly told.

### Daily flow (this repo)
- [ ] `npm run dev-sync` — fetch origin, merge origin/dev, run gauntlet, push if green (dev-N / staging only)
- [ ] `npm run check` — full local gauntlet: clean caches → build → typecheck → lint → test
- [ ] `npm run pulse` — daily read-only prod health board (git / CI+backups / Railway)
- [ ] `npm install` — install deps
- [ ] `npm run dev` — run web + relay + worker locally (or `dev:web` / `dev:relay` / `dev:worker`)

### Database & migrations (user runs these)
- [ ] `npm run db:deploy` — apply pending migrations to the env's DB (deployed envs)
- [ ] `npm run db:migrate:dev` — create + apply a migration locally
- [ ] `npm run db:migrate:status` — read-only: are migrations applied / any drift *(packages/db workspace)*
- [ ] `npm run db:studio` — open Prisma Studio
- [ ] `npm run db:generate` — regenerate Prisma client
- [ ] `npm run db:reset` — reset DB (destructive)
- [ ] `npm run guard:prisma` — schema-edit-without-migration guard

### Seeds
- [ ] `npm run db:seed` — run the seed set
- [ ] `npm run db:seed:uoms` — units of measure
- [ ] `npm run db:seed:categories` — categories
- [ ] `npm run db:seed:work-order-statuses` — WO statuses
- [ ] `npm run db:seed:properties` — properties from CSV
- [ ] `npm run db:upsert-owner` — break-glass DEVELOPER owner recovery
- [ ] `npm run upload:brand-logo` — upload brand logo asset

### Promote / merge (main ← staging ← dev)
- [ ] `git pull --ff-only origin main`
- [ ] `git merge --ff-only staging` → `npm run db:deploy` → `git push origin main`
- [ ] `git merge --ff-only dev` → `git push origin staging`
- [ ] `git rebase origin/staging`
- [ ] `git push --force-with-lease origin dev`

### dev-N sub-branch sync
- [ ] `git fetch && git merge origin/dev-x`
- [ ] `git rebase origin/dev`
- [ ] `git push --force-with-lease origin dev-x`
- [ ] `git fetch` · `git fetch origin` · `git push`

### Build / quality (individual gauntlet steps)
- [ ] `npm run build` — build all workspaces
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run knip` — unused-export sweep
- [ ] `npm run test` · `npm run test:e2e`
