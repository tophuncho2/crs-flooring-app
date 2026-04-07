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
| [domains/BUILDER_AUTH.md](domains/BUILDER_AUTH.md) | Users, roles, auth, admin |
| [domains/WORK_ORDERS.md](domains/WORK_ORDERS.md) | Work orders and allocation (stub) |
| [domains/INVENTORY.md](domains/INVENTORY.md) | Inventory and warehouse (stub) |


## Review order** (dependencies flow top-down — each doc should only reference docs above it or at the same level)

1. `layers/DOMAIN.md` — foundation, no dependencies
2. `layers/DATA.md` — depends on domain types
3. `layers/APPLICATION.md` — depends on domain + data
4. `layers/TRANSPORT.md` — depends on application output
5. `layers/CONTROLLER.md` — depends on transport + engines
6. `layers/UI.md` — depends on controllers
7. `execution/EXECUTION_ENGINE.md` — the 9-step backbone
8. `execution/ROUTE_POLICY.md` — HTTP implementation of execution engine
9. `execution/ERROR_HANDLING.md` — referenced by route policy
10. `execution/IDEMPOTENCY.md` — referenced by route policy
11. `cross-cutting/AUTH.md`
12. `cross-cutting/AUTHORIZATION.md`
13. `cross-cutting/TRANSACTIONS.md`
14. `cross-cutting/RATE_LIMITING.md`
15. `cross-cutting/OBSERVABILITY.md`
16. `cross-cutting/VALIDATION.md`
17. `cross-cutting/TESTING.md`
18. `cross-cutting/DEPLOYMENT.md` ← new
19. `patterns/MODULE_ANATOMY.md`
20. `patterns/OUTBOX_PATTERN.md`
21. `patterns/API_DESIGN.md`
22. `patterns/ACCEPTED_EXCEPTIONS.md`
23. `engines/LIST_VIEW_ENGINE.md`
24. `engines/RECORD_VIEW_ENGINE.md`
25. `engines/NAVIGATION_SHELL.md`
26. `services/RELAY.md`
27. `services/WORKER.md`
28. `domains/BUILDER_AUTH.md`
29. `domains/INVENTORY.md`
30. `domains/WORK_ORDERS.md`

Review them in this order. Each doc should be accurate against the codebase before moving to the next. Want a Claude Code prompt to start the sweep?