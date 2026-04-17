# Single-Section → Domain — Imports / Exports

> What swept single-section modules actually pull from `@builders/domain`. Grouped by export kind. Evidence scan: `apps/web/modules/{manufacturers,contacts,services,admin}`.

## Row / detail types

Consumed by list tables, detail clients, record panels.

| Symbol | Source | Used by |
|---|---|---|
| `ManufacturerRow` | `packages/domain/src/flooring/manufacturers/types.ts` | manufacturers (list + record) |
| `ContactRow`, `ContactDetail` | `packages/domain/src/flooring/contacts/types.ts` | contacts (list + record) |
| `ServiceRow`, `UnitOption` | `packages/domain/src/flooring/services/types.ts` | services (list + record) |
| `GovernableRole` | `packages/domain/src/admin/types.ts` | admin (`data/queries.ts`) |

## Form shapes + empty-form constants + converters

Single-section's canonical pattern — every module exports all three per entity.

| Module | Form type | Empty | Converter |
|---|---|---|---|
| manufacturers | `ManufacturerForm` | `EMPTY_MANUFACTURER_FORM` | `toManufacturerForm` |
| contacts | `ContactForm` | `EMPTY_CONTACT_FORM` | `toContactForm` |
| services | `ServiceForm` | `EMPTY_SERVICE_FORM` | `toServiceForm` |
| admin | — | — | — |

Consumers: `{name}-create-client.tsx` imports the empty constant; `use-{name}-primary-section.ts` imports the converter; both import the Form type.

## Form validators

| Symbol | Source | Consumer |
|---|---|---|
| `validateServiceForm` | `services/types.ts:32` | `use-service-primary-section.ts:14` |
| `validateContactForm` | `contacts/types.ts:37` | `use-contact-primary-section.ts:14` |
| `validateContactType` | `contacts/types.ts:33` | (used inside `validateContactForm`) |


## Module-level constants

| Symbol | Source | Consumer |
|---|---|---|
| `CONTACT_TYPE_LABELS`, `CONTACT_TYPE_OPTIONS` | `contacts/types.ts:3,5` | `contact-primary-fields-section.tsx:12` |

## Utilities (from `shared/`)

`formatStableDateTime` (`packages/domain/src/shared/date-format.ts:33`) is imported by every swept module's `*-primary-fields-section.tsx` and every list table. Admin imports it in both places too.

