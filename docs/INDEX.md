# Architecture Documentation Index

> **Rule:** Every doc in this directory is normative. Deviations from these docs are defects.
> **Rule:** When code changes, the relevant doc updates in the same commit.

## Layers
| Doc | Scope |
|-----|-------|
| [layers/DOMAIN.md](layers/DOMAIN.md) | Business rules and invariants. `packages/domain/` |
| [layers/APPLICATION.md](layers/APPLICATION.md) | Use case orchestration. `packages/application/` |
| [layers/DATA.md](layers/DATA.md) | Persistence and repositories. `packages/db/` |
| [layers/CONTROLLER.md](layers/CONTROLLER.md) | Controller contracts for list and record views |
| [layers/TRANSPORT.md](layers/TRANSPORT.md) | Payload assembly and response shaping |
| [layers/UI.md](layers/UI.md) | Presentational components. No logic, no fetching |

## Engines
| Doc | Scope |
|-----|-------|
| [engines/LIST_VIEW_ENGINE.md](engines/LIST_VIEW_ENGINE.md) | List view engine contract and controls |
| [engines/RECORD_VIEW_ENGINE.md](engines/RECORD_VIEW_ENGINE.md) | Record view sections, dirty state, reconciliation |
| [engines/NAVIGATION_SHELL.md](engines/NAVIGATION_SHELL.md) | App shell, header, URL-driven navigation |

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
| [patterns/MODULE_ANATOMY.md](patterns/MODULE_ANATOMY.md) | Feature module folder structure |
| [patterns/OUTBOX_PATTERN.md](patterns/OUTBOX_PATTERN.md) | Outbox/relay event delivery |
| [patterns/ACCEPTED_EXCEPTIONS.md](patterns/ACCEPTED_EXCEPTIONS.md) | Documented deviations |
| [patterns/API_DESIGN.md](patterns/API_DESIGN.md) | API route conventions, response shapes, endpoint naming |

## Domain References
| Doc | Scope |
|-----|-------|
| [domains/USER_GOVERNANCE.md](domains/USER_GOVERNANCE.md) | Users, roles, auth, admin |
| [domains/WORK_ORDERS.md](domains/WORK_ORDERS.md) | Work orders and allocation (stub) |
| [domains/INVENTORY.md](domains/INVENTORY.md) | Inventory and warehouse (stub) |


Review them in this order. Each doc should be accurate against the codebase before moving to the next. Want a Claude Code prompt to start the sweep?