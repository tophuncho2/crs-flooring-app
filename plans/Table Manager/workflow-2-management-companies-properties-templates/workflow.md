# Workflow 2
## Management Companies -> Properties -> Templates

## Purpose

This workflow defines how users move from top-level customer/account structure into reusable job templates before work-order creation begins.

## User Navigation Flow

1. User opens the management companies table and creates a management company with the add form.
2. User opens a management company row to see company information and linked properties.
3. From the company open workflow, user opens an existing property or creates a new property linked to that management company.
4. User opens a property to see property information and linked templates.
5. From the property open workflow, user opens an existing template or creates a new template linked to that property.
6. User manages template details, material rows, service rows, instructions, warehouse, and pricing inside the template workflow.
7. This workflow ends before work-order creation.

## Current Implemented Behavior

- `implemented`: management companies can be created from the add form.
- `implemented`: management companies support `Edit` and `Open`.
- `implemented`: opening a management company exposes linked properties.
- `implemented`: users can create a property from the management-company context.
- `implemented`: users can open linked properties from the management-company context.
- `implemented`: properties support `Edit` and `Open`.
- `implemented`: opening a property exposes property information and linked templates.
- `implemented`: users can create a template from the property context.
- `implemented`: users can open linked templates from the property context.
- `implemented`: templates support `Edit` and `Open`.
- `implemented`: template record panels support template header management plus material and service rows.
- `implemented`: template pricing behavior exists as part of template row management and summaries.

## Missing Behavior

- `partially implemented`: management companies and properties do not yet behave like a fully standardized linked record-panel system across every child-record action.
- `missing`: stronger workflow guidance in the UI about when users should create templates from the property context versus from the standalone templates table.
- `missing`: an explicit customer-facing navigation summary showing that this workflow stops before work orders begin.

## Workflow Risks And Ambiguous Decisions

- `partially implemented`: the linked record flow exists, but the user mental model still depends on understanding multiple related tables rather than one strongly guided progression.
- `future-state / pending workflow finalization`: template reuse rules are owned by business workflow docs, not by this navigation doc.
- `future-state / pending workflow finalization`: deeper property-to-template automation should not be assumed here unless it already exists in code.

## User-Workflow Checklist

- [ ] Standardize the management-company and property linked record-panel behavior so the child-record workflow feels identical across both screens.
- [ ] Clarify when users should create templates from the property panel versus the standalone templates table.
- [ ] Keep this workflow clearly separate from work-order creation so users understand templates are the endpoint of this flow.
