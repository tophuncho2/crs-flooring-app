# Architecture Documentation Index

> **Rule:** Every doc in this directory is normative. Deviations from these docs are defects.
> **Rule:** When code changes, the relevant doc updates in the same commit.

## Layers
| Doc | Scope |
|-----|-------|
| [layers/domain/PATTERN.md](layers/domain/PATTERN.md) | Business rules and invariants. `packages/domain/` |
| [layers/application/APPLICATION.md](layers/application/APPLICATION.md) | Use case orchestration. `packages/application/` |
| [layers/application/ERROR_HANDLING.md](layers/application/ERROR_HANDLING.md) | Error classification and response shapes |
| [layers/application/TRANSACTIONS.md](layers/application/TRANSACTIONS.md) | Transaction boundaries and outbox |
| [layers/data/DATA.md](layers/data/DATA.md) | Persistence and repositories. `packages/db/` |
| [server/SERVER.md](server/SERVER.md) | Server-layer overview |
| [server/EXECUTION_ENGINE.md](server/EXECUTION_ENGINE.md) | The 9-step execution sequence |
| [server/ROUTE_POLICY.md](server/ROUTE_POLICY.md) | HTTP route policy wiring |
| [server/IDEMPOTENCY.md](server/IDEMPOTENCY.md) | Mutation receipts and deduplication |
| [server/AUTH.md](server/AUTH.md) | Authentication and session management |
| [server/AUTHORIZATION.md](server/AUTHORIZATION.md) | Roles, capabilities, tool access |
| [server/RATE_LIMITING.md](server/RATE_LIMITING.md) | Rate limit enforcement |
| [layers/app/api/VALIDATION.md](layers/app/api/VALIDATION.md) | Shared validation infrastructure, input parsing |
| [layers/controllers/CONTROLLERS.md](layers/controllers/CONTROLLERS.md) | Controller contracts for list and record views |
| [layers/app/api/API_DESIGN.md](layers/app/api/API_DESIGN.md) | API route conventions, response shapes, endpoint naming |
| [layers/app/dashboard/DASHBOARD.md](layers/app/dashboard/DASHBOARD.md) | Dashboard Server Components and page contracts |
| [layers/controllers/TRANSPORT.md](layers/controllers/TRANSPORT.md) | Client-side payload assembly and response shaping |
| [layers/components/COMPONENTS.md](layers/components/COMPONENTS.md) | Presentational components. No logic, no fetching |

## Engines
| Doc | Scope |
|-----|-------|
| [module-anatomy/shared/LIST_VIEW_ENGINE.md](module-anatomy/shared/LIST_VIEW_ENGINE.md) | List view engine contract and controls |
| [module-anatomy/shared/RECORD_VIEW_ENGINE.md](module-anatomy/shared/RECORD_VIEW_ENGINE.md) | Record view sections, dirty state, reconciliation |
| [module-anatomy/shared/NAVIGATION_SHELL.md](module-anatomy/shared/NAVIGATION_SHELL.md) | App shell, header, URL-driven navigation |

## Cross-Cutting Concerns
| Doc | Scope |
|-----|-------|
| [cross-cutting/OBSERVABILITY.md](cross-cutting/OBSERVABILITY.md) | Logging, tracing, Sentry, Railway |
| [cross-cutting/TESTING.md](cross-cutting/TESTING.md) | Test strategy, mock isolation, vitest conventions |
| [cross-cutting/DEPLOYMENT.md](cross-cutting/DEPLOYMENT.md) | Deployment configuration and process |

## Services
| Doc | Scope |
|-----|-------|
| [services/RELAY.md](services/RELAY.md) | Outbox relay service |
| [services/WORKER.md](services/WORKER.md) | BullMQ worker service |

## Patterns
| Doc | Scope |
|-----|-------|
| [module-anatomy/MODULE_ANATOMY.md](module-anatomy/MODULE_ANATOMY.md) | Feature module folder structure |
| [patterns/OUTBOX_PATTERN.md](patterns/OUTBOX_PATTERN.md) | Outbox/relay event delivery |
| [module-anatomy/ACCEPTED_EXCEPTIONS.md](module-anatomy/ACCEPTED_EXCEPTIONS.md) | Documented deviations |

## Module Anatomy
| Doc | Scope |
|-----|-------|
| [module-anatomy/single-seeded/modules/categories/CATEGORIES.md](module-anatomy/single-seeded/modules/categories/CATEGORIES.md) | Categories reference data module |
| [module-anatomy/single-seeded/modules/unit-of-measures/UNIT_OF_MEASURES.md](module-anatomy/single-seeded/modules/unit-of-measures/UNIT_OF_MEASURES.md) | Unit of Measures reference data module |

## Domain References
| Doc | Scope |
|-----|-------|
| [module-anatomy/single-section/modules/user-governance/USER_GOVERNANCE.md](module-anatomy/single-section/modules/user-governance/USER_GOVERNANCE.md) | Users, roles, auth, admin |


Review them in this order. Each doc should be accurate against the codebase before moving to the next. Want a Claude Code prompt to start the sweep?