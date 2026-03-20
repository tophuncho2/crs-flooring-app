# Table Manager
## Canonical Home For User Navigation And Table-To-Table Workflow Truth

This folder is the source of truth for how users are expected to move across the table-driven parts of the app.

Use this folder when the work is primarily about:
- user navigation across linked tables
- row creation flow
- `Edit` versus `Open` behavior
- linked-record drilldown behavior
- where table workflows stop and the next operational workflow begins
- identifying missing user-workflow behavior that still needs implementation

This manager is intentionally lighter than the other managers in this pass.
It does not have an `assessment/` folder yet.
Its purpose is to make the user workflow explicit enough that future implementation work can be compared against a stable navigation spec.

Workflow folders:
- [Workflow 1](/Users/ottohull/builderswebapp/builderswebapp/plans/Table%20Manager/workflow-1-manufacturers-products-imports-inventory-cut-logs/workflow.md)
- [Workflow 2](/Users/ottohull/builderswebapp/builderswebapp/plans/Table%20Manager/workflow-2-management-companies-properties-templates/workflow.md)
- [Workflow 3](/Users/ottohull/builderswebapp/builderswebapp/plans/Table%20Manager/workflow-3-work-orders-sync-processing-completion-analytics/workflow.md)
- [Workflow 4](/Users/ottohull/builderswebapp/builderswebapp/plans/Table%20Manager/workflow-4-basic-backend-tables-and-login-activity/workflow.md)

Ownership boundary:
- `Flooring Domain Manager` owns business and operational workflow truth.
- `Table Manager` owns user navigation and table-to-table interaction workflow truth.
- `Order Processing Manager` owns the send/process/completion contract once a work order moves into operational processing.

Update rules:
- update these workflow docs when row actions, record panels, linked navigation, or create flows change materially
- label each behavior as `implemented`, `partially implemented`, `missing`, or `future-state / pending workflow finalization`
- roll missing user-workflow items into [PROJECT_EXECUTION_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Program%20Manager/PROJECT_EXECUTION_CHECKLIST.md)
