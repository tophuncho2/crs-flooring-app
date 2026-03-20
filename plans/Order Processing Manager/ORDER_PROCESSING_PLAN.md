# Order Processing Plan
## Working Home For The Still-Evolving Order Processing Workflow

Date:
- 2026-03-19

This file is the updateable planning home for the work-order processing workflow.
It exists because the worker-era order flow is still being mapped and should not stay spread across root notes, workflow files, and ad hoc thread memory.

---

# 1. Current Confirmed Truth

- Work-order processing begins after a user creates a work order and syncs or prepares its template/material/service data.
- Template-based work-order creation now belongs at the work-orders table level rather than inside the work-order record-panel options flow.
- The table-level sync flow is: select property -> search templates for that property -> create the work-order row -> open the row.
- The future processing system is expected to allocate inventory, generate files, generate statistics, and return results back onto the work order and item rows.
- Location is a critical worker-facing field for inventory decisions.
- Sections and warehouse structure support location truth, but category-specific bay logic belongs in processing logic, not basic warehouse CRUD logic.
- Inventory rows used by a work order need pricing attached so actual material usage cost can be represented at the work-order item level.
- Cut logs may come from work-order processing or from manual cuts.
- A completed-order review experience will likely connect to analytics later.

---

# 2. Current Partial Truth

- The exact status list is not fully locked.
- The exact shortage lifecycle is not fully locked.
- Resend and reprocess behavior is not fully locked.
- The exact completion trigger is not fully locked.
- The exact analytics update timing is not fully locked.
- The exact worker payload contract is not fully locked.
- The exact failure-handling and retry expectations are not fully locked.

---

# 3. Processing Phases To Lock Before Worker Implementation

## Phase A. Processing Status And Shortage Truth

- define the ordered processing statuses from pre-send through completion
- define which statuses are manual and which will eventually be worker-owned
- define shortage creation, update, clear, and display rules
- define whether shortages block send, partially allow send, or only flag downstream review

## Phase B. Send And Processing Contract

- define what happens when a user sends an order into processing
- define what stays synchronous versus what becomes worker-owned later
- define resend and reprocess rules
- define which work-order fields lock after send

## Phase C. Allocation And Return Values

- define how inventory allocation attaches back to work-order items
- define how shortage markers attach back to work-order items and order-level state
- define what generated files are created and where they attach
- define what statistics or derived outputs are returned

## Phase D. Completion And Analytics Truth

- define the exact event that makes an order complete
- define whether completion is user-driven, worker-driven, or mixed
- define when analytics updates occur
- define where completed orders are reviewed in the UI

## Phase E. Worker Implementation Gate

- define the worker payload shape
- define retry, idempotency, and failure surfacing expectations
- define observability requirements
- confirm earlier phases are stable enough to automate safely

---

# 4. Immediate Checklist

- [ ] Lock the exact ordered work-order processing status list.
- [ ] Lock the shortage lifecycle and shortage display rules.
- [ ] Lock resend and reprocess behavior.
- [ ] Lock which fields become immutable after send.
- [ ] Lock allocation attachment behavior on work-order items.
- [ ] Lock generated-file ownership and attachment behavior.
- [ ] Lock completion trigger and analytics timing.
- [ ] Lock worker payload, retry, and observability requirements.

---

# 5. Current Working Rule

Do not implement worker processors until this file has stable answers for status truth, shortage truth, send behavior, completion behavior, and analytics timing.
