# Shared Variables Manager

This folder tracks the current state of shared variables, constants, config values, and reusable app-wide value definitions.

## Structure

- `inventory/current-status.md`
  Current shared-variable inventory across the app.
- `assessment/overall-assessment.md`
  Current manager-level assessment of shared-value maturity and scaling gaps.
- `assessment/strengths-weaknesses.md`
  Strengths, weaknesses, and cleanup priorities.

## Scope

This manager is meant to help reduce page-level clutter by identifying values that should live in shared modules instead of being repeated inside route files, feature clients, or service logic.

Update these files whenever:

- a new shared constant file is added
- an env variable or runtime config is introduced
- a page moves literals into shared modules
- a shared-variable source becomes duplicated or outdated
