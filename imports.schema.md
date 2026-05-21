# Imports Schema Edit — Handoff to Staging Claude

## Context

You're picking up a multi-step sweep on the `imports` module. The b-branch worktree has already done the consumer-side prep work (just landed):

- **Imports list view search** retargeted to `purchaseOrderNumber` (contains, case-insensitive).
- **Imports list view default sort** changed to `{ createdAt: "desc" }, { id: "desc" }`.
- **API validator + page fallback prefs** updated to match.
- **Search input placeholder** flipped to `"Search PO #"`.

Net effect: `importNumber` is no longer referenced anywhere live for search or sort. Nothing depends on its current 4-digit 0-padded format.

**Your job:** drop the 0-prefix from `importNumber` at the schema layer, mirroring the templates precedent.

---

## Precedent to mirror

Read these two commits before doing anything:

- `f7762260 schema(flooring-template): drop zero-pad on templateNumber default` — the schema + migration shape.
- `cc3b4be4 refactor(templates): drop templateNumber from queries, sort, and picker primary` — the consumer-side sweep that preceded it.

The b-branch search/sort sweep is the `cc3b4be4` analogue for imports. You're now doing the `f7762260` analogue.

Use `git show f7762260` and `git show cc3b4be4` to read the diffs verbatim. Mirror the shape — same column-type decision, same default-expression decision, same migration body shape.

---

## Target

`FlooringImportEntry.importNumber` in `packages/db/prisma/schema.prisma`. Current shape:

```prisma
importNumber  Int  @unique @default(autoincrement())
```

Apply whatever shape `templateNumber` ended up with in `f7762260`. If `templateNumber` stayed `Int` and only a sequence/default expression changed, do the same. If `templateNumber` switched types entirely, do the same.

---

## What to do

1. **Edit `packages/db/prisma/schema.prisma`** — apply the analogous change to `FlooringImportEntry.importNumber`. Schema edits only; nothing else.
2. **Do NOT run the migration command.** The user (`j.otto`) will run `npm run db:migrate:dev -- --name <name_matching_templates_precedent>` themselves. Their run will generate the migration file under `packages/db/prisma/migrations/` and sync it to the local DB.
3. **Hand back to the user** once `schema.prisma` is edited. The user will run the migrate command, then commit schema + migration in a single commit (project rule: "Schema changes are always in a commit by itself").
4. **Display formatters — do NOT touch them in this commit.** Per project rule schema commits stand alone. The three display call sites (below) get their zero-pad dropped in a follow-up commit on b-branch after merge-back:
   - `apps/web/modules/imports/components/list/table/imports-row-cell.tsx` — `formatImportNumber()`
   - `apps/web/modules/imports/components/list/imports-table.tsx` — `formatImportNumber()`
   - `apps/web/modules/imports/components/record/import-detail-client.tsx` — `formatImportNumber()`
   - All three currently use `` `IMP-${String(value).padStart(4, "0")}` ``.
   - (Caveat: if `f7762260` itself bent this rule and rode along with display changes for templates, follow that precedent instead. Read the diff first.)

---

## Commit shape

One commit. Schema + migration only. Match the templates commit message format exactly:

```
schema(flooring-import): drop zero-pad on importNumber default
```

No body needed unless the templates commit had one — match it.

---

## Verification before handing back

- `npm run guard:prisma` — passes.
- `npm run typecheck` — your change introduces no new errors. **Note:** existing errors in `packages/db/src/flooring/work-orders/*` and `packages/db/src/management/templates/*` are pre-existing on this branch (in-flight work-orders/templates rebuild). Do not try to fix them.
- Confirm the b-branch search/sort sweep is present in the working tree (you should see `purchaseOrderNumber` + `createdAt` in `packages/db/src/flooring/imports/read-repository.ts` `buildListViewWhere`/`buildListViewOrderBy`). If not, the merge from b-branch hasn't happened yet — stop and flag to the user.

---

## Explicitly out of scope (b-branch picks these up after merge-back)

- Wiring the inventory list-view filter chips at `apps/web/modules/inventory/components/list/toolbar-controls/import-number-filter-chip.tsx` and `purchase-order-filter-chip.tsx`. Both are currently disabled placeholder buttons; they get wired up once the new `importNumber` shape is in place and b-branch is back in the driver's seat.
- Adding an "Import #" filter chip back into the imports list-view toolbar (sibling to the PO# search).
- Refreshing `apps/web/tests/modules/imports/imports-client.test.tsx` — its `ImportsClient` props signature has drifted from the live component (uses `initialIsAscendingSort` which no longer exists). Unrelated to this sweep.
- Display-formatter zero-pad drops in the 3 files listed above (unless `f7762260` precedent rides them along — read the diff to decide).

---

## Flow summary

1. ✅ b-branch — search/sort sweep (DONE, awaiting commit + merge).
2. 🟡 **YOU (staging) — this handoff: schema edit only.**
3. 🟡 User runs `npm run db:migrate:dev` to generate + sync the migration.
4. 🟡 User commits schema + migration in one commit on staging.
5. 🟡 User merges staging → b-branch.
6. 🟡 b-branch — display-formatter zero-pad drops + inventory filter chip wire-up (separate follow-up commits).
