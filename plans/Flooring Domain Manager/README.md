# Flooring Domain Planning
## Canonical Home For Flooring Module Planning And Execution Tracking

This folder is the source of truth for planning work specific to the flooring product domain.

Use this folder when the work is primarily about:
- flooring feature modules under `features/flooring/`
- flooring pages under `app/dashboard/flooring/`
- flooring API routes under `app/api/flooring/`
- domain-specific UI patterns that only exist in flooring
- workflow detail beyond the top-level domain plan

This folder exists because flooring is now the largest product area in the codebase.
It contains:
- simple table domains such as products, properties, manufacturers, services, and management companies
- complex workflow domains such as templates, work orders, inventory, imports, and cut logs
- shared flooring UI/query/mutation patterns that are too specific for general shared-feature planning

Keep global architecture in the top-level plans.
Use this folder for flooring-specific decisions, rollout sequencing, and domain breakdowns that would otherwise overload:
- `DOMAIN_WORKFLOW_PLAN.md`
- `KEY_FEATURES.md`
- `ANALYTICS_PLAN.md`

Recommended future files in this folder:
- flooring-domain-index.md
- simple-domains-rollout.md
- complex-workflows-roadmap.md
- template-work-order-detail-plan.md
- inventory-imports-cutlogs-plan.md
