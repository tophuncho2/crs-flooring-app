# Workflow 3
## Work Orders -> Template Sync -> Processing -> Completion -> Analytics

## Purpose

This workflow defines what starts when a user creates a work order and how that work order is expected to move through sync, preparation, processing, completion, and analytics.

## User Navigation Flow

1. User opens the work-orders table.
2. User chooses either `Work Order` to create a blank row or `Sync Template` to create a work order from a property template.
3. In the table-level sync flow, the user selects a property, searches that property's templates, selects one, creates the row, and the new work order opens immediately.
4. User reviews and edits material rows, service rows, and pricing on the work order.
5. User continues managing the work order as the live operational record.
6. Future-state processing then sends the order into worker/automation logic.
7. Processing is expected to allocate inventory, generate files, apply shortage information, and return results to the work order and item rows.
8. Later, a user marks the work order complete.
9. Completion is expected to update analytics.
10. A completed-orders and analytics review experience is expected to exist later, but is not fully mapped yet.

## Current Implemented Behavior

- `implemented`: work orders can be created from the work-orders table.
- `implemented`: template-based work-order creation now starts from a dedicated table-level `Sync Template` action.
- `implemented`: table-level template creation selects property first, filters templates by that property, creates the row, and opens it immediately.
- `implemented`: work orders support `Edit` and `Open`.
- `implemented`: work-order record panels exist.
- `implemented`: work-order header, material-row, and service-row editing exists as a live operational workflow.
- `implemented`: pricing is already part of the work-order editing surface.
- `partially implemented`: work-order status behavior exists, but the final lifecycle is still not stabilized.
- `missing`: the true send/process worker workflow is not yet implemented end-to-end.
- `missing`: processing output attachment to work orders and work-order item rows is not yet complete.
- `missing`: analytics completion flow is not yet fully implemented or finalized.

## Missing Behavior

- `missing`: final send-off workflow that takes a prepared work order into worker processing.
- `missing`: final inventory allocation behavior and final shortage propagation behavior.
- `missing`: final file generation and attachment workflow.
- `missing`: final status automation across send, processing, shortage, and completion.
- `missing`: completed-orders review page integrated into the analytics or completion experience.
- `missing`: final rules for how work-order-linked cut logs should persist, move, or be cleaned up over time.

## Workflow Risks And Ambiguous Decisions

- `future-state / pending workflow finalization`: the template-to-work-order entry point is now table-driven, but downstream send timing and allocation timing are still under active workflow design.
- `future-state / pending workflow finalization`: the worker may return inventory attachments, shortage markers, files, and other output fields, but the exact payload and ownership rules are not finalized yet.
- `future-state / pending workflow finalization`: pricing truth is expected to live on work-order material items, especially if cut-log cleanup or reassignment changes later.
- `future-state / pending workflow finalization`: completion-to-analytics behavior is still only partially mapped.

## User-Workflow Checklist

- [ ] Finalize the work-order status lifecycle and visible user states.
- [ ] Finalize the table-level template-to-work-order creation rules and any duplicate-prevention rules.
- [ ] Implement the worker-driven send/process workflow.
- [ ] Return allocation, shortage, and generated-file results back onto the work order and item rows.
- [ ] Finalize how inventory attachments appear on work-order items.
- [ ] Finalize how cut logs relate to work-order processing and long-term retention.
- [ ] Implement the completed-orders review experience and connect it to analytics.
- [ ] Finalize analytics update timing and ownership after completion.
