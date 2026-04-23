# Deferred — Management-System Sweep

Work intentionally pushed past this sweep. Each item should be safe to revisit as an additive, isolated follow-up; if anything here starts blocking sweep goals, promote it back into `alteration/`.

## Sync, file generation, and auto-allocation — pending cut logs

**Deferred (all blocked on cut logs being secured across inventory and work orders):**
- [ ] Template → work order sync mutation flow.
- [ ] Work order sync / snapshot reconciliation (template pull).
- [ ] Cut logs integration inside work order material items (scope completed under `inventory-system/balances/cut-logs`; management-system waits on it).
- [ ] File generation for work orders (mirrors the template file-generation flow).
- [ ] Auto-allocation (inventory → work orders).

**Scope clarification for this sweep:**
- In-scope: management companies, properties, job types, templates main section + material items diff-save, work orders main section.
- Out-of-scope (until cut logs are secured): everything in the list above, plus work orders material items (its child-scope cut-log wiring is the blocker).

**Conditions that pull these back in:**
- Cut logs are secured within inventory and work orders.
- Templates main and work orders main sections are both stable, with their use cases exercised by the dashboard.

## File generation for templates (worker + bucket)

**Deferred:**
- [ ] Introduce a worker for file generation (templates would be the first module to use one).
- [ ] Connect a file bucket for template-generated files (first module to persist to bucket storage).
- [ ] Decide whether generated files auto-download to the user's device (leaning simplest path). Work orders will later mimic this flow with minor differences.

**Why it's safe to defer:**
- Any fields eventually needed (`generatedFileUrl`, `generatedAt`, `fileJobId`, a `FlooringFileJob` model) are additive and nullable — low-risk to add in a later migration.
- No current sweep work depends on file generation. Schema correctness, management-company links, job types, sync reconciliation, and the analytics invariant are all orthogonal.
- A v1 can generate-and-stream synchronously from the request (no worker, no bucket, no persistence) if the "auto-download to device" path is chosen.

**Conditions that would pull this back in:**
- UI affordance (e.g. "download PDF" button) ships in this sweep → backend must exist.
- Generated files must be retrievable later (audit, re-download, email attachments) → bucket becomes required.
- Generation exceeds request timeouts (>~30s) → worker becomes required.
