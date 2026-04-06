# Record View Engine

> **Scope:** Section-based record editing. Each section has its own controller, dirty state, and save lifecycle.
> **Location:** `apps/web/modules/shared/engines/record-view/`
> **Status:** Active

## Rules

1. Record pages are composed of independent sections. Each section has its own controller and save lifecycle.
2. `useRecordSectionController` manages per-section state — data, dirty tracking, validation, save.
3. Dirty state is tracked against an initial snapshot. A section is dirty if any field differs from the snapshot.
4. Reconciliation follows **replace** semantics — server wins. Local changes are overwritten on server update.
5. Conflict detection flags the condition but does not block. `pendingServerState` queues updates during save.
6. Page-level navigation guard prevents leaving with unsaved changes across any section.
7. Each section renders a canonical sub-header with dirty indicator, save button, and discard button.
8. Delete uses a confirmation prompt before executing.

## Contract

### Section Controller

`useRecordSectionController` exposes:

```typescript
const section = useRecordSectionController({
  initialData: serverData,
  validate: validateFn,
  save: saveFn,
  onSaved?: callback,
})

// Returns:
{
  data: T,                    // Current section data
  initialData: T,             // Snapshot from server
  isDirty: boolean,           // Any field differs from initial
  isLoading: boolean,         // Fetch or save in progress
  isSaving: boolean,          // Save specifically in progress
  errors: FieldErrors,        // Per-field validation errors
  validationState: State,     // Overall validation status
  setField: (key, value),     // Update a single field
  validate: () => boolean,    // Run validation, return pass/fail
  save: () => Promise,        // Submit to server
  reset: () => void,          // Revert to initial snapshot
  reload: () => Promise,      // Re-fetch from server
}
```

### Reconciliation Flow

```
Server update arrives
  │
  ├─ Section is NOT saving → replace initialData + data immediately
  │
  └─ Section IS saving → queue as pendingServerState
                          → apply after save completes
```

### Page-Level Guard

The record page checks all sections for dirty state. If any section is dirty, browser navigation triggers a confirmation dialog.

## Patterns

```
modules/shared/engines/record-view/
├── shell/              ← Page-level layout, navigation guard
├── sections/           ← Section header, save/discard controls
├── forms/              ← Form field renderers
├── panel/              ← Side panels, multi-section panels
└── hooks/              ← useRecordSectionController, useRecordNotices
```

Module-specific:
```
modules/{name}/
├── controller/
│   ├── use-{name}-primary-controller.ts     ← Primary section
│   └── use-{name}-{section}-controller.ts   ← Additional sections
├── components/record/
│   ├── {name}-detail-client.tsx             ← Client wrapper
│   ├── {name}-primary.tsx                   ← Primary section form
│   └── {name}-{section}.tsx                 ← Additional section forms
```

## Anti-Patterns

1. **Do not** build custom form state management — use `useRecordSectionController`.
2. **Do not** merge local and server state manually — the engine handles reconciliation.
3. **Do not** save multiple sections in a single API call — each section saves independently.
4. **Do not** skip the navigation guard — all record pages must protect against unsaved changes.
5. **Do not** optimistically update the list view from the record view — let the list refetch.

## Related Docs

- [../layers/CONTROLLER.md](../layers/CONTROLLER.md) — section controller contract
- [LIST_VIEW_ENGINE.md](LIST_VIEW_ENGINE.md) — companion engine for list pages
- [NAVIGATION_SHELL.md](NAVIGATION_SHELL.md) — app shell that wraps record pages
