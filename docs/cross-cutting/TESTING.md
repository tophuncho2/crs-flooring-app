# Testing

> **Scope:** Test strategy, framework conventions, mock isolation, and what gets tested where.
> **Location:** `apps/web/tests/`, `apps/relay/tests/`, `apps/worker/tests/`
> **Status:** Active
> **Grade: C+** — Consistent patterns where tests exist, but coverage is selective and shared infrastructure is thin.

## Rules

1. All tests use **Vitest** (`vitest run`). No Jest. Playwright handles the single E2E smoke test.
2. Tests live in `apps/{app}/tests/`, mirroring module structure — never co-located with source files.
3. Every test file uses `vi.hoisted()` + `vi.mock()` for dependency isolation. Prisma is mocked via a hoisted object, never via `@prisma/client` mock utilities.
4. `clearMocks: true` and `restoreMocks: true` are set in vitest config. Tests must not rely on mock state leaking between cases.
5. Route tests assert HTTP status codes and response shapes. Application tests assert use-case orchestration. Domain tests assert invariants.
6. The setup file (`tests/setup.ts`) globally mocks Next.js navigation. No other globals.

## Contract

### Test Categories

| Category | Location | What it proves |
|----------|----------|----------------|
| Route tests | `tests/modules/{mod}/{mod}-routes.test.ts` | Auth, parsing, status codes, response shape |
| Application tests | `tests/modules/{mod}/{mod}-application.test.ts` | Use-case orchestration with mocked repos |
| Domain tests | `tests/modules/{mod}/{mod}-domain.test.ts` | Business rules and invariants |
| Validation tests | `tests/modules/{mod}/{mod}-form-validation.test.ts` | Input parsing and error messages |
| Server tests | `tests/server/` | Auth, HTTP helpers, rate limiting |
| Shared tests | `tests/shared/` | Reference test data, shared utilities |
| E2E | `tests/e2e/` | Playwright smoke test (login + navigate) |

### Prisma Mock Pattern

```typescript
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    entity: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return { ...actual, prisma: prismaMock, db: prismaMock }
})
```

### Test Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `next-navigation-mock.ts` | `tests/helpers/` | Mocks Next.js router (push, replace, refresh) |
| `route-error.ts` | `tests/helpers/` | Mock error response builder |
| `simple-table-client-mocks.tsx` | `tests/helpers/` | UI component mocks |
| `reference-test-data.js` | `packages/db/scripts/` | Deterministic, prefix-able seed data |

### Running Tests

```bash
npm test                    # all apps sequentially
npm run test -w @builders/web   # web only
npm run test:e2e            # Playwright smoke test
```

## Patterns

- **65 test files** across the monorepo (63 web, 1 relay, 1 worker).
- Well-tested modules: contacts, work orders, templates, products, inventory, categories.
- Route tests dominate — most modules have route tests even when missing domain or application tests.
- No snapshot testing — all assertions are explicit value checks.
- Factory functions are embedded in individual test files, not shared.

## Anti-Patterns

1. **Do not** use `jest` APIs — this is a Vitest codebase. No `jest.fn()`, `jest.mock()`.
2. **Do not** import the real Prisma client in tests. Always mock via `vi.hoisted()` + `vi.mock("@builders/db")`.
3. **Do not** rely on test execution order. Each test must set up its own mock return values in `beforeEach` or inline.
4. **Do not** add globals beyond what `tests/setup.ts` provides. If a mock is needed by a single module, it belongs in that test file.
5. **Do not** write E2E tests for individual features — the E2E suite is a smoke test only.

## Gaps

- **No shared test factories.** Each test file re-creates mock data inline. A shared factory for common entities (products, work orders) would reduce duplication.
- **Packages are untested at source level.** `packages/domain/`, `packages/application/`, `packages/db/` have no unit tests — they are tested indirectly through app-level tests.
- **E2E coverage is minimal** — one smoke test. No critical-path feature coverage.
- **No test coverage reporting** configured in vitest or CI.

## Related Docs

- [ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — route handler structure that route tests verify
- [MODULE_ANATOMY.md](../patterns/MODULE_ANATOMY.md) — module folder structure mirrored by test layout
- [ERROR_HANDLING.md](../execution/ERROR_HANDLING.md) — error shapes asserted in route tests
