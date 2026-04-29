# Plan — Drop `propertyInstructions` Columns + Templates Cleanup

Status: **PENDING APPROVAL.** Prerequisite to the work-orders sweep. Locks in "property instructions are derived live from `Property.instructions`, never snapshotted on the WO/Template row."

## Why this lands first

Currently both `FlooringWorkOrder` and `FlooringTemplate` carry their own `propertyInstructions` snapshot column. Decision: drop them, derive the value live from the joined `Property.instructions` on read. Templates module is already shipped and consumes the column across domain → data → application → API → UI, so it has to be cleaned up before the work-orders sweep starts. Work-orders scaffolding also references the column even though the WO sweep hasn't begun — those references must be wiped in the same cleanup commit to keep the build green.

The lookup CELL on the templates UI (readonly display of `property.instructions`) is **NOT** added in this plan — that's a later sweep per the intent. This plan removes the field cleanly; UI display of the live value comes later.

## Commit plan — strictly two commits, in this order

### Commit 1 — Schema only

Per `CLAUDE.md`: schema changes are always in a commit by themselves.

| Step | Action |
|---|---|
| 1.1 | Edit `packages/db/prisma/schema.prisma`: delete line 440 (`propertyInstructions String?` from `FlooringTemplate`) and line 549 (same field on `FlooringWorkOrder`). |
| 1.2 | `npx prisma migrate dev --name drop_property_instructions_columns --schema packages/db/prisma/schema.prisma` — generates migration file `packages/db/prisma/migrations/<timestamp>_drop_property_instructions_columns/migration.sql` AND applies to local dev DB. |
| 1.3 | Review generated SQL — should be exactly two `ALTER TABLE … DROP COLUMN` statements. No data migration needed (tables truncated). |
| 1.4 | `npx prisma generate --schema packages/db/prisma/schema.prisma` — regenerate Prisma client so TS picks up the schema change. (`migrate dev` does this automatically; explicit step listed for clarity.) |
| 1.5 | Commit. Build will be **broken** at this point — that's expected. The next commit fixes it. |

**Deploy path (non-local environments):** `npx prisma migrate deploy --schema packages/db/prisma/schema.prisma` runs the generated migration file against staging/prod. No `migrate dev` outside local — `deploy` is the only command that runs in CI/Railway.

**Verification after commit 1:**
- Migration file exists at `packages/db/prisma/migrations/<timestamp>_drop_property_instructions_columns/`.
- Migration SQL is exactly the two DROP COLUMN statements.
- `npx prisma migrate status` reports clean.

### Commit 2 — Code cleanup (templates module + WO scaffolding)

Wipes all references to the dropped columns. Build returns to green.

#### Templates layer (7 files)

| Layer | File | Change |
|---|---|---|
| Domain | `packages/domain/src/management/templates/types.ts` | Drop `propertyInstructions: string` from `TemplateForm` (line 23), `TemplateDetail` (line 42), and `EMPTY_TEMPLATE_FORM` (line 54). |
| Domain | `packages/domain/src/management/templates/normalizers.ts` | Drop `propertyInstructions: string \| null` from raw input type (line 25). Drop `propertyInstructions: template.propertyInstructions ?? ""` from `normalizeTemplate` body (line 56). |
| Domain | `packages/domain/src/management/templates/form-rules.ts` | Drop `propertyInstructions: template.propertyInstructions` from `validateTemplateForm` mapping (line 18). |
| Data | `packages/db/src/management/templates/read-repository.ts` | Drop `propertyInstructions: true` from `templateDetailSelect` (line 47). |
| Data | `packages/db/src/management/templates/write-repository.ts` | Drop optional field from `WriteTemplateInput` type (line 15) and from select shape (line 35). |
| API | `apps/web/app/api/templates/_validators.ts` | Drop `propertyInstructions: optionalText(...)` from create validator (line 57). Drop the conditional update assignment (line 74). |
| UI | `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | Delete the textarea/input block at lines 118–119 (and surrounding label wrapper). No replacement cell — lookup display lands in a later sweep. |

#### Work-orders scaffolding (5 files)

These exist as bare-bones types from before the WO sweep started. Wipe the field so the build stays green; the WO sweep proper starts from a clean slate.

| Layer | File | Change |
|---|---|---|
| Domain | `packages/domain/src/flooring/work-orders/types.ts` | Drop `propertyInstructions` from `WorkOrderForm` (line 27), `WorkOrderDetail` (line 47), `EMPTY_WORK_ORDER_FORM` (line 65). |
| Domain | `packages/domain/src/flooring/work-orders/normalizers.ts` | Drop from raw type (line 29) and from normalize body (line 70). |
| Domain | `packages/domain/src/flooring/work-orders/form-rules.ts` | Drop from validation mapping (line 23). |
| Data | `packages/db/src/flooring/work-orders/shared.ts` | Drop `propertyInstructions: true` from select (line 32). |
| Data | `packages/db/src/flooring/work-orders/write-repository.ts` | Drop optional field from `WriteWorkOrderInput` (line 16). |

#### Smoke page (1 file)

| File | Change |
|---|---|
| `apps/web/app/components-smoke/page.tsx` | Delete the local `propertyInstructions` state hook (line 243) and the textarea binding (line 695). Smoke page is a mock fixture; no functional impact. |

#### Verification after commit 2

| Check | Command | Expected |
|---|---|---|
| Type check, db package | `npm run typecheck --workspace @builders/db` | exit 0 |
| Type check, domain package | `npm run typecheck --workspace @builders/domain` | exit 0 |
| Type check, application package | `npm run typecheck --workspace @builders/application` | exit 0 |
| Type check, web app | `npm run typecheck --workspace @builders/web` | exit 0 |
| Build, all workspaces | `npm run build` | exit 0 |
| Grep sweep | `grep -rn propertyInstructions --include='*.ts' --include='*.tsx' --include='*.prisma'` | **zero matches** |

If grep returns any matches the commit is incomplete — fix and amend before pushing.

## Out of scope (explicit)

| Item | Why deferred |
|---|---|
| Adding the readonly "Property instructions" lookup cell to the templates record view | Belongs to a later templates polish sweep. This plan only **removes** the field. |
| Adding the same lookup cell to the work-orders record view | Belongs to the work-orders sweep (sweep 7), not this prerequisite. |
| Joining `property: { select: { instructions: true } }` into `templateDetailSelect` | Not needed until the lookup cell is added. The existing `property: { select: { name: true } }` stays untouched in this commit. |
| Any work-orders module-dir changes | WO sweep hasn't started; only the existing scaffolding type files get the field stripped. |

## Risk + rollback

| Risk | Likelihood | Mitigation |
|---|---|---|
| Migration generated with unexpected SQL (e.g. picks up other unintended schema diffs) | Low — schema only edited at the two known lines | Step 1.3 review before commit. If anything extra appears, abort, reset schema, redo. |
| Cleanup commit misses a reference and breaks build | Low — grep step is mandatory in verification | Grep gate in verification table. CI also catches it. |
| Local dev DB out of sync with migration on other workstations | N/A — tables truncated, fresh `migrate dev` rebuilds | — |
| Need to revert | `npx prisma migrate resolve --rolled-back <name>` then revert both commits in reverse order | Migration is destructive (DROP COLUMN), so reverting requires a new ADD COLUMN migration, not a `migrate reset`. Tables truncated → no data loss either way. |

## Open questions

| # | Question |
|---|---|
| 1 | Should the cleanup commit also add `instructions: true` to the existing `property: { select: { name: true } }` in `templateDetailSelect` and `workOrderDetailSelect`, so the read shape is ready for the later lookup-cell sweep to consume? Or strictly remove-only and leave the select expansion to that future sweep? My lean: **strictly remove-only** — the future sweep should own its own read shape change so the diff is clean. |
| 2 | Smoke page (`components-smoke/page.tsx`) — keep the textarea in the mock and just rename the state, or fully delete? My lean: **fully delete** since the field no longer exists in the real form types. |

## Sequence after this plan executes

```
✅ This plan — drop propertyInstructions schema + templates/WO-scaffold cleanup
👉 Sweep 7 — work orders module (revised intent: primary + material-items only; file-gen + WOMI cut-log expandable row deferred)
   Sweep 8 — WOMI cut-log expandable row (deferred per a-branch/work-order-material-items/intent.md)
   Sweep 9 — file-generation pipeline (new — split out from sweep 7)
```
