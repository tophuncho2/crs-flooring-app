# Domain

## Purpose

The domain layer is the source of truth for types, rules, and invariants. It contains pure logic — no I/O, no framework ties, no side effects. It is the innermost dependency of the system: routes, loaders, and use cases all consume domain, but nothing in domain consumes them.

## Location

- Canonical path: `packages/domain/src/flooring/<module>/`
- Exported via `@builders/domain`.
- Domain never lives inside `apps/web/modules/<module>/`.

## Structure per module

Typical contents (contacts as the reference):

- `types.ts` — value types (`ContactRow`, `ContactForm`), enums, mappers (`toContactForm`), validation functions (`validateContactForm`).
- `<rule>-rules.ts` — invariant checks and rule helpers (e.g. `delete-rules.ts` with `isContactDeleteBlocked`, `getContactDeleteBlockedMessage`).
- `index.ts` — barrel file. Consumers import from the barrel, not individual files.

## What belongs here

- Value types and DTOs that describe a domain entity.
- Validation functions (shape + invariants) that operate on plain inputs and return typed results or throw domain errors.
- Business rules expressed as pure functions (e.g. "a contact cannot be deleted while linked to a template").
- Error classes that describe domain-level failure modes.
- Constants and enums with semantic meaning.

## What does NOT belong

- Prisma, `fetch`, `fs`, or any network/disk I/O.
- React, JSX, or any `"use client"` / `"use server"` code.
- References to use cases, routes, or repositories.
- Framework-specific helpers (Next.js, Express, etc.).

## Import rules

- Domain **does not** import from application or data.
- Domain **does not** import from any module directory (`apps/web/modules/…`).
- Domain may depend on other domain subpackages or pure utilities only.

## Example

```typescript
// packages/domain/src/flooring/contacts/delete-rules.ts
export function isContactDeleteBlocked(state: ContactDeleteLinkState) {
  return state.templateAssignments > 0 || state.workOrderAssignments > 0
}
```

## Violations checklist

- [ ] Domain code imports from `@builders/application` or `@builders/db`.
- [ ] Domain file imports from `@/modules/...` (module directory).
- [ ] Domain references the Prisma client, `fetch`, `fs`, or any async I/O.
- [ ] Domain file exports JSX or uses React hooks.
- [ ] Module directory defines a local `domain/` folder shadowing the canonical package (e.g. `apps/web/modules/properties/domain/`).
- [ ] Domain types duplicated in a module's local `types` file instead of re-exported from `@builders/domain`.
- [ ] Domain rule expressed as a class method with internal mutable state instead of a pure function.
- [ ] Error thrown from domain is a generic `Error` instead of a named domain error class.
