# Deferred — Management-System Sweep

Work intentionally pushed past this sweep. Each item should be safe to revisit as an additive, isolated follow-up; if anything here starts blocking sweep goals, promote it back into `alteration/`.

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
