# Architecture Documentation Index

> **Rule:** Every doc in this directory is normative. Deviations from these docs are defects.
> **Rule:** When code changes, the relevant doc updates in the same commit.

## Layers
| Doc | Scope |
|-----|-------|
| [layers/domain/DOMAIN.md](layers/domain/DOMAIN.md) | Business rules and invariants. `packages/domain/` |
| [layers/application/APPLICATION.md](layers/application/APPLICATION.md) | Use case orchestration. `packages/application/` |
| [layers/data/DATA.md](layers/data/DATA.md) | Persistence and repositories. `packages/db/` |
| [layers/controller/CONTROLLER.md](layers/controller/CONTROLLER.md) | Controller contracts for list and record views |
| [layers/api/API.md](layers/api/API.md) | Payload assembly and response shaping |
| [layers/ui/UI.md](layers/ui/UI.md) | Presentational components. No logic, no fetching |

## Engines
| Doc | Scope |
|-----|-------|
| [module-anatomy/shared/LIST_VIEW_ENGINE.md](module-anatomy/shared/LIST_VIEW_ENGINE.md) | List view engine contract and controls |
| [module-anatomy/shared/RECORD_VIEW_ENGINE.md](module-anatomy/shared/RECORD_VIEW_ENGINE.md) | Record view sections, dirty state, reconciliation |
| [module-anatomy/shared/NAVIGATION_SHELL.md](module-anatomy/shared/NAVIGATION_SHELL.md) | App shell, header, URL-driven navigation |

## Execution
| Doc | Scope |
|-----|-------|
| [execution/EXECUTION_ENGINE.md](execution/EXECUTION_ENGINE.md) | The 9-step execution sequence |
| [execution/ROUTE_POLICY.md](execution/ROUTE_POLICY.md) | HTTP route policy wiring |
| [execution/ERROR_HANDLING.md](execution/ERROR_HANDLING.md) | Error classification and response shapes |
| [execution/IDEMPOTENCY.md](execution/IDEMPOTENCY.md) | Mutation receipts and deduplication |

## Cross-Cutting Concerns
| Doc | Scope |
|-----|-------|
| [cross-cutting/AUTH.md](cross-cutting/AUTH.md) | Authentication and session management |
| [cross-cutting/AUTHORIZATION.md](cross-cutting/AUTHORIZATION.md) | Roles, capabilities, tool access |
| [cross-cutting/OBSERVABILITY.md](cross-cutting/OBSERVABILITY.md) | Logging, tracing, Sentry, Railway |
| [cross-cutting/RATE_LIMITING.md](cross-cutting/RATE_LIMITING.md) | Rate limit enforcement |
| [cross-cutting/TRANSACTIONS.md](cross-cutting/TRANSACTIONS.md) | Transaction boundaries and outbox |
| [cross-cutting/TESTING.md](cross-cutting/TESTING.md) | Test strategy, mock isolation, vitest conventions |
| [cross-cutting/VALIDATION.md](cross-cutting/VALIDATION.md) | Shared validation infrastructure, input parsing |
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
| [patterns/ACCEPTED_EXCEPTIONS.md](patterns/ACCEPTED_EXCEPTIONS.md) | Documented deviations |
| [patterns/API_DESIGN.md](patterns/API_DESIGN.md) | API route conventions, response shapes, endpoint naming |
| [patterns/REFERENCE_DATA.md](patterns/REFERENCE_DATA.md) | Seeded read-only reference tables (UoMs, Categories) |

## Module Anatomy
| Doc | Scope |
|-----|-------|
| [module-anatomy/single-seeded/modules/CATEGORIES.md](module-anatomy/single-seeded/modules/CATEGORIES.md) | Categories reference data module |
| [module-anatomy/single-seeded/modules/UNIT_OF_MEASURES.md](module-anatomy/single-seeded/modules/UNIT_OF_MEASURES.md) | Unit of Measures reference data module |

## Domain References
| Doc | Scope |
|-----|-------|
| [module-anatomy/single-section/modules/USER_GOVERNANCE.md](module-anatomy/single-section/modules/USER_GOVERNANCE.md) | Users, roles, auth, admin |


Review them in this order. Each doc should be accurate against the codebase before moving to the next. Want a Claude Code prompt to start the sweep?