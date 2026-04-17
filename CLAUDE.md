# Builders Web App

## Architecture Reference Docs

Before making changes, read `docs/INDEX.md` to identify relevant architecture docs. Then read the specific docs listed below based on what you're touching.

### Trigger Conditions

**Layer work:**
- Touching `packages/domain/` → read `docs/layers/domain/PATTERN.md`
- Touching `packages/application/` → read `docs/layers/application/APPLICATION.md`
- Touching `packages/db/` → read `docs/layers/data/DATA.md`

**Engine work:**
- Touching any module's `controller/` directory → read `docs/layers/controller/CONTROLLER.md`
- Touching `modules/shared/engines/list-view/` → read `docs/module-anatomy/shared/LIST_VIEW_ENGINE.md`
- Touching `modules/shared/engines/record-view/` → read `docs/module-anatomy/shared/RECORD_VIEW_ENGINE.md`
- Touching `modules/app-shell/` → read `docs/module-anatomy/shared/NAVIGATION_SHELL.md`

**Route and execution work:**
- Touching any file in `app/api/` → read `docs/layers/server/ROUTE_POLICY.md` + `docs/layers/server/EXECUTION_ENGINE.md`
- Touching error handling → read `docs/layers/application/ERROR_HANDLING.md`
- Touching mutation receipts or idempotency → read `docs/layers/server/IDEMPOTENCY.md`
- Touching API response shapes or endpoint conventions → read `docs/layers/app/api/API_DESIGN.md`
- Touching accepted exceptions → read `docs/patterns/ACCEPTED_EXCEPTIONS.md`

**Cross-cutting concerns:**
- Touching `server/auth/` → read `docs/layers/server/AUTH.md` + `docs/layers/server/AUTHORIZATION.md`
- Touching rate limiting → read `docs/layers/server/RATE_LIMITING.md`
- Touching logging or Sentry → read `docs/cross-cutting/OBSERVABILITY.md`
- Touching transactions or outbox → read `docs/layers/application/TRANSACTIONS.md`
- Touching validators → read `docs/layers/server/VALIDATION.md`
- Touching tests → read `docs/cross-cutting/TESTING.md`
- Touching environment config or Railway → read `docs/cross-cutting/DEPLOYMENT.md`

**Service work:**
- Touching `apps/worker/` → read `docs/services/WORKER.md`
- Touching `apps/relay/` → read `docs/services/RELAY.md`

**Module work:**
- Creating a new module → read `docs/module-anatomy/MODULE_ANATOMY.md`
- Working on outbox events → read `docs/patterns/OUTBOX_PATTERN.md`

**Domain work:**
- Working on users, auth, roles, admin → read `docs/domains/BUILDER_AUTH.md`
- Working on work orders or allocation → read `docs/domains/WORK_ORDERS.md`
- Working on inventory or warehouses → read `docs/domains/INVENTORY.md`
