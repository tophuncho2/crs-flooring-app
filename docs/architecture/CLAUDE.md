# Architecture — Usage Rules

## `directories/`

`directories/` is the canonical description of how the system is structured — one file per layer. Each file defines the purpose, location, conventions, and a violations checklist for its layer.

**Use `directories/` for:**
- Boundaries between layers (what imports what, what is allowed where).
- Canonical folder and file layout per layer.
- Naming conventions that apply across the codebase.
- Rules and anti-patterns, expressed as abstract violations checklists.

**Do not put in `directories/`:**
- Specific module names as violation examples ("module X has a local `domain/` folder").
- Known bugs, drift, or outstanding refactors against the canonical shape.
- Sweep-specific or ticket-specific notes.
- Code audits or per-module change lists.

Module-specific findings belong in a sweep or audit document — for example under `docs/sweeps/<sweep>/…` — not here. If a violation exists in a real module, note it where the sweep tracks the work; keep `directories/` describing only the target state.
