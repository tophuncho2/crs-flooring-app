# Domain — Alterations

Domain rules, logic, and types. Grouped by module. Source comments in `../mocks.md`.

## Clients / Properties

- [ ] When a property is linked to a work order or template, snapshot the property's `instructions` onto the linked record. The snapshot remains editable on the linked record; edits don't propagate back to the property row.

## Main-Hub / Templates

- [ ] Template `instructions` syncs from the linked property on link; remains editable after link; edits don't affect the property's row.

## Main-Hub / Work Orders

- [ ] Template → work order sync is deferred until the templates and work orders modules are secure.
- [ ] Invariant: every work order must be linked to an analytics row.
