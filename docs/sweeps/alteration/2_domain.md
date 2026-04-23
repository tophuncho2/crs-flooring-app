# Domain — Alterations

Domain rules, logic, and types. Grouped by module (order reflects completion order). Source comments in `../mocks.md`.

Layer contract: domain is pure logic — predicates, message builders, derived calculations. No I/O, no repository calls, no throwing side-effects outside the defined validator/assert helpers.

## Management Companies

- [ ] Mutation domain rules: unique `name`; other fields optional.
- [ ] Deletion behavior: linked `Property.managementCompanyId` becomes null (schema-level `SetNull`).

## Properties

- [ ] `instructions` is free text, optional.
- [ ] On linking a property to a template or work order, snapshot the property's `instructions` onto the linked record. The snapshot remains editable on the linked record; edits on the property do not propagate to already-linked records.
- [ ] Flow: user creates a management company → links properties to it → property `instructions` seed any template/work order that is later linked to that property. Those instructions stay editable per template/work-order record.

## Templates

- [ ] Template `instructions` syncs from the linked property on link; remains editable after link; edits on the linked record don't affect the property.
- [ ] Template links to `jobType` (optional) — one job type per template.
- [ ] Template links to `managementCompany` (optional) — one management company per template.
- [ ] `description` field is free text.
- [ ] Template → work order sync mutations are **deferred** until templates and work orders modules are both valid, *and* cut logs are set up. See `./deferred.md`.
- [ ] Calculations are decomposed. Templates track **material items cost only**. With the service-item and sales-rep models removed, no service or commission math runs at the template level.
- [ ] Packages layer (new) for templates: owns its own domain (including the material-items domain), its own use cases (application), and its own repository reads/writes (data). Each subsection inside the template record view is part of this single layer.

## Job Types

- [ ] Pure lookup — `name` unique.
- [ ] Relations to templates and work orders are optional (nullable FK, `SetNull` on delete — deleting a job type leaves linked rows with `jobTypeId = null`).

## Work Orders

- [ ] Invariant: every work order must be linked to an analytics row.
- [ ] Work order links to `jobType` (optional) and `managementCompany` (optional).
- [ ] `description` field added — free text.
- [ ] Drop `googleDocUrl` / `googleDriveSlip` from validators in `apps/web/modules/work-orders/validators.ts` (lines ~48–49, 453–454, 476–477).
- [ ] Remove `googleDocUrl` / `googleDriveSlip` entries from the `TEMPLATE_SYNC_POLICY` in `apps/web/modules/work-orders/contracts.ts` (lines ~40–41).
- [ ] Template → work order sync mutation flow is **deferred** (see `./deferred.md`).
- [ ] Calculations are decomposed:
  - **Material items cost** — what the customer pays for the material items.
  - **Cut log cost** — what the company pays to use those cuts.
- [ ] Cut logs sit as the **child scope** of work order material items. Domain composition for that child scope is scoped to after cut logs is secured (see `./deferred.md`).
