# Domain Package

Pure business rules — the innermost layer. Types, invariants, predicates,
normalizers, and message builders. No I/O, no framework, no side effects.

## Rules

1. No imports from `@builders/db`, `@builders/application`, or any `apps/` code.
2. No Prisma types, no DB calls, no HTTP, no filesystem, no queue dispatch.
3. Only allowed external dependency: `zod`.
4. All functions are pure — accept plain data, return plain data or throw a
   **named domain error class** (`errors.ts`). Never throw a generic `Error`.
5. Consumers import the `@builders/domain` barrel, never deep `src/...` paths.
   Each module re-exports through its `index.ts`; root `index.ts` re-exports
   each module barrel.
6. The data layer (`@builders/db`) may import *pure* helpers (formatters,
   computations) to share one source of truth — but never throwing rules
   (`validate*`, `assert*`, `is*Blocked`).

## Layout

`src/<area>/<module>/` — areas: `flooring/`, `management/`, `shared/`, `queue/`.
Domain never lives under `apps/web/modules/`.

## File vocabulary (names carry meaning)

| File | Holds |
|---|---|
| `types.ts` | DTOs/value types, `to<Module>Form` mappers, zod payload schemas |
| `*-rules.ts` / `form-rules.ts` | predicates + `validate<Module>Form` |
| `errors.ts` / `error-messages.ts` | named error classes / message constants |
| `normalizers.ts` | pure shape→shape only (Prisma-row→record lives in data) |
| `editability.ts` | editable/immutable field sets + guards |
| `list-config.ts` / `column-limits.ts` | shared list + length constants |
| `queue/*` | message builders for outbox/worker payloads (build only, no dispatch) |
| `index.ts` | barrel — the only import surface |
