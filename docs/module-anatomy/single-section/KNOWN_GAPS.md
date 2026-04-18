# Single-Section — KNOWN GAPS

> Gaps that apply to the single-section pattern as a whole, plus module-specific violations migrated here after per-module `GRADING.md`/`PLANS.md` files were retired.

## Sweep status

**Swept:**
- `manufacturers`
- `contacts`
- `services`
- `user-governance` (admin — swept with documented cleanups below)

**Not swept:**
- (none — every single-section module currently in the app has been swept)

## Pattern-level gaps

No open pattern-level gaps.

## Module-specific violations

### contacts

- (no open violations)

### manufacturers

- **Domain** — No `validateManufacturerForm` export in `packages/domain/src/flooring/manufacturers/types.ts`. Services and contacts ship `validate{Name}Form` in their `types.ts` and consume it from `use-{name}-primary-section.ts`. Add for parity.

### services

- (no open violations)

### user-governance

Admin consumes domain at a fraction of the volume of manufacturers/contacts/services.

- **Domain** — No `UserForm` / `EMPTY_USER_FORM` / `toUserForm` triad in domain.
- **Domain** — No `validateUserForm` import. Services and contacts consume `validate{Name}Form` from `domain/{name}/types.ts` inside their primary-section controller; admin does not.
- **Domain** — Mutation flow bypasses the form/converter pattern; inlined in controller.
- **Domain** — Only `GovernableRole` + `formatStableDateTime` are imported from domain.
- **API** — `apps/web/app/api/admin/users/` has no `_validators.ts`. Input parsing is inlined in the route handlers. Other single-section references (`manufacturers`, `contacts`, `services`) colocate a `_validators.ts` next to the routes.
- **API** — No `[id]/primary/section/route.ts` split. Other single-section references ship a dedicated batch-update route for the primary section. Leaving as-is is tied to Accepted Exception 1 (admin skips optimistic concurrency); deviation noted here for visibility.
- **Controller** — `apps/web/modules/admin/controller/use-admin-user-primary-controller.ts` is named `-primary-controller.ts`. Other single-section references use `-primary-section.ts`. Align on one convention.
- **Controller** — `apps/web/modules/admin/controller/use-admin-user-primary-controller.ts:24,39` calls `requestJson("/api/admin/users/…")` directly. Other single-section references route mutations through `data/mutations.ts`. Admin has no `data/mutations.ts`.
- **UI** — `apps/web/modules/admin/components/record/admin-user-create-client.tsx:43` calls `requestJson("/api/admin/users")` directly. UI components should not fetch; mutation should move into a controller or `data/mutations.ts` helper.
