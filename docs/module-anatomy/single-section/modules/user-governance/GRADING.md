# User Governance — Grading

> Per-layer grade and open violations for the user-governance (admin) module.

## Domain

**Grade:** TBD

- Amin consumes domain at a fraction of the volume of manufacturers/contacts/services:

- [ ] No `UserForm` / `EMPTY_USER_FORM` / `toUserForm` triad in domain.
- [ ] No `validateUserForm` import. Services and contacts consume `validate{Name}Form` from `domain/{name}/types.ts` inside their primary-section controller; admin does not.
- [ ] Mutation flow bypasses the form/converter pattern; inlined in controller (see `modules/user-governance/GRADING.md`).
- [ ] Only `GovernableRole` + `formatStableDateTime` are imported.


## Data

**Grade:** TBD

- (no open violations)

## Application

**Grade:** TBD

- (no open violations)

## Server

**Grade:** TBD

- (no open violations)

## API

**Grade:** TBD

- [ ] `apps/web/app/api/admin/users/` has no `_validators.ts`. Input parsing is inlined in the route handlers. Other single-section references (`manufacturers`, `contacts`, `services`) colocate a `_validators.ts` next to the routes.
- [ ] No `[id]/primary/section/route.ts` split. Other single-section references ship a dedicated batch-update route for the primary section. Leaving as-is is tied to Accepted Exception 1 (admin skips optimistic concurrency); deviation noted here for visibility.

## Controller

**Grade:** TBD

- [ ] `apps/web/modules/admin/controller/use-admin-user-primary-controller.ts` is named `-primary-controller.ts`. Other single-section references use `-primary-section.ts`. Align on one convention.
- [ ] `apps/web/modules/admin/controller/use-admin-user-primary-controller.ts:24,39` calls `requestJson("/api/admin/users/…")` directly. Other single-section references route mutations through `data/mutations.ts`. Admin has no `data/mutations.ts`.

## UI

**Grade:** TBD

- [ ] `apps/web/modules/admin/components/record/admin-user-create-client.tsx:43` calls `requestJson("/api/admin/users")` directly. UI components should not fetch; mutation should move into a controller or `data/mutations.ts` helper.
