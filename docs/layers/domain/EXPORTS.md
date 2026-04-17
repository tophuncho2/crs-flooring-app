# Domain — Exports

> **Scope:** What domain code exposes and who consumes it.

## Export shapes

- **Predicates** — `(input) => boolean`. Named `can…`, `is…`, `has…`.
- **Message builders** — `(input) => string`. Named `build…Message` / `get…Message`.
- **Normalizers** — `(raw) => canonical`. Named `normalize…`.
- **Diff validators** — `validateDiff(diff, existing) => DiffValidationIssue[]` plus the per-module `DiffValidationIssue` code union.
- **Identity helpers** — `assignDiffIds(entries, generateId)` style functions; `generateId` is always injected.
- **Queue schemas** — queue name, job name, Zod payload schema, retry policy, shared status enums.
- **Types** — domain entity types, `EMPTY_*_FORM` constants, `to*Form` converters, Zod parsers for external input.
- **Utilities** — pure formatters, calculators, and record helpers under `shared/`.

## Output contract

- Plain data only. No Prisma types, no `Request`/`Response` objects, no HTTP status codes.
- Domain does not throw. Failures are expressed as return values (`false`, reason string, `DiffValidationIssue[]`).
- Queue schemas exist in domain because every service — producers, workers, relays — must agree on the wire shape.

## Consumers

- **`packages/application/`** — predicates, message builders, normalizers, diff validators, identity helpers, queue schemas, types, utilities.
- **`apps/web/modules/`** (controllers and UI) — utilities (formatters, calculators, record helpers), `EMPTY_*_FORM` constants, `to*Form` converters.
- **`apps/worker/`** — queue schemas for job payload validation, plus any domain rules the use cases it delegates to depend on.
- **`packages/db/`** — does **not** import from domain. Data defines its own row/record types and maps at the boundary.
