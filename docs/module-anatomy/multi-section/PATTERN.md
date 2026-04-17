# Multi-Section — PATTERN

> **Scope:** Contract every multi-section module must follow. A multi-section module has a list view and a record view with multiple child entities that save atomically through a diff payload.
> **Reference implementations:** `warehouse` (mid-sweep; first multi-section).

_Left intentionally minimal. Fill in once the warehouse sweep completes and a second multi-section module (templates or work-orders) is in flight._

## Rules

- TBD

## Module Structure — `apps/web/modules/{name}/`

- TBD

## Dashboard Routes — `apps/web/app/dashboard/{name}/`

- TBD

## API Routes — `apps/web/app/api/{name}/`

- TBD

## Anti-Patterns

- TBD

## Known gaps

Tracked in [KNOWN_GAPS.md](KNOWN_GAPS.md).

## Related Docs

- [../MODULE_ANATOMY.md](../MODULE_ANATOMY.md)
- [../shared/LIST_VIEW_ENGINE.md](../shared/LIST_VIEW_ENGINE.md)
- [../shared/RECORD_VIEW_ENGINE.md](../shared/RECORD_VIEW_ENGINE.md)
- [../../layers/controller/CONTROLLER.md](../../layers/controller/CONTROLLER.md)
- [../../layers/domain/module-specific/DIFF_RULES.md](../../layers/domain/module-specific/DIFF_RULES.md)
