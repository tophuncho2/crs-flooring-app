# Domain Workflow Plan
## Operational Truth For Templates, Work Orders, Inventory, Shortages, And Completion

This file defines the intended domain workflow of the system in operational terms.

It should be used whenever:
- schema changes are proposed
- workflow logic changes are proposed
- UI flow changes are proposed
- worker automation is being designed

---

# 1. Core Domain Model

The main operational flow is:

1. reusable templates are created
2. templates contain material items and service items
3. pricing rolls up to the template total
4. work orders are created from templates
5. work orders become live operational records
6. inventory is allocated and deducted
7. shortages are detected
8. files are generated
9. processed orders update status and fields
10. completed orders feed analytics

---

# 2. Template Workflow

## 2.1 Purpose
Templates are reusable job configurations.

## 2.2 Template contents
- header fields
- material item rows
- service item rows

## 2.3 Template pricing
Each row stores pricing.
That pricing rolls up into the template total.

This total represents:
- expected invoice cost
- expected job revenue

## 2.4 Template behavior
- templates are reusable
- templates are not live operational records
- templates can be used repeatedly

---

# 3. Work Order Workflow

## 3.1 Purpose
Work orders are the live operational version of a job.

## 3.2 Creation paths
Work orders may be created:
- from a template
- by form/manual creation

## 3.3 Copy model
When a template is used:
- template rows are copied into work-order rows
- no live linkage remains after copy
- work order becomes independent

## 3.4 Work-order editing
After creation:
- users may edit the work order
- users may edit work-order rows
- template remains unchanged

---

# 4. Template To Work Order Sync Rules

## 4.1 Current intended rule
Template sync applies to draft work orders only.

## 4.2 Sync modes
- overwrite
- append

## 4.3 Sync requirements
- property must match
- sync behavior must be explicit
- sync should be previewable
- sync must be safe and transactional

## 4.4 What sync should copy
- material rows
- service rows
- row pricing
- notes
- other operational row data defined as part of the template

## 4.5 What sync should not do by default
- mutate the template
- rely on hidden fallback calculations
- apply unrelated fulfillment logic

---

# 5. Inventory Workflow

## 5.1 Purpose
Inventory connects work-order rows to real warehouse stock.

## 5.2 Planned workflow
- user prepares work order
- system attempts inventory allocation
- inventory is deducted when processing occurs
- cut logs are created to track actual usage

## 5.3 Operational requirements
- inventory deduction must be accurate
- allocation must be traceable
- shortages must be visible at line and order level

---

# 6. Cut Log Workflow

Cut logs should record:
- which inventory item was used
- how much was used
- remaining quantity after cut
- related work order
- related work-order item

Cut logs are part of inventory truth and fulfillment traceability.

---

# 7. Shortage Workflow

## 7.1 Item-level shortage
If a work-order item does not have sufficient inventory:
- the item row receives a shortage marker

## 7.2 Order-level shortage
If any item row has shortage:
- the entire order is marked shortage

## 7.3 Operational consequence
If the order is shortage:
- it is not considered fully valid
- it must be corrected
- it must be resent after correction

---

# 8. Processing Workflow

Once a work order is processed, the system should update:
- work-order status
- file references
- allocation results
- shortage markers
- other operational output fields

The work order remains the primary live operational record.

---

# 9. Generated Files Workflow

The system is planned to generate:
- order slip
- picking slip
- additional fulfillment files if needed later

These should be attached or referenced on the work order.

File generation is a strong candidate for worker processing.

---

# 10. Completion Workflow

## 10.1 Completion trigger
Users manually mark the work order complete.

## 10.2 Why manual completion matters
Completion should represent confirmed real-world completion, not just automated processing.

## 10.3 Completion effects
- work-order status updates
- analytics update
- downstream reporting reflects completed work

---

# 11. Analytics Workflow

Analytics should reflect actual completed operational work.

It should eventually support:
- completed job count
- revenue totals
- material totals
- service totals
- shortage trends
- throughput reporting

Analytics should not treat draft activity as final operational output.

---

# 12. Workflow States To Finalize

The following still require final standardization:
- full work-order status set
- shortage lifecycle states
- sent/export state transitions
- inventory allocation state transitions
- resend rules
- completion eligibility rules

---

# 13. Synchronous vs Worker Responsibilities

## Keep synchronous
- create template
- edit template
- create work order
- edit work order
- template → draft work-order sync

## Move to workers
- send work order
- file generation
- inventory sync fan-out
- notifications
- external system integrations

---

# 14. Domain Rules That Must Stay Centralized

These rules must stay in the backend/domain layer:
- template sync rules
- shortage rules
- resend rules
- completion rules
- analytics update rules
- inventory allocation rules

They should not live only in the frontend.

---

# 15. Definition Of Success

This workflow plan is successful when:
- templates are reusable and accurate
- work orders are fast to create
- sync is safe
- inventory truth is preserved
- shortages are obvious
- generated files support operations
- completed orders feed analytics reliably

---

This file should be updated whenever workflow rules materially change.
