# Order Processing Manager
## Canonical Home For Work-Order Send, Processing, Completion, And Worker-Readiness Truth

This manager owns the operational order-processing layer that starts after a work order is created and synced.

Use this folder for:
- send-work-order behavior
- inventory allocation ownership
- shortage behavior during processing
- generated-file ownership
- worker inputs and outputs
- completion rules
- analytics handoff after completion
- the readiness gate before BullMQ worker implementation

Primary files:
- [ORDER_PROCESSING_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Order%20Processing%20Manager/ORDER_PROCESSING_PLAN.md)
- [overall-assessment.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Order%20Processing%20Manager/assessment/overall-assessment.md)
- [strengths-weaknesses.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Order%20Processing%20Manager/assessment/strengths-weaknesses.md)

Current posture:
- strengths: the upstream workflow and data context are mostly mapped
- weaknesses: the exact processing contract, status truth, resend behavior, completion trigger, and analytics timing are not fully locked
- immediate focus: finalize processing truth before worker implementation starts
