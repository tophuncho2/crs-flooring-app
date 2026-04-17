# Single-Section — KNOWN GAPS

> Deviations observed in the reference implementations (`manufacturers`, `contacts`, `services`, `admin`). Paired with `PATTERN.md`.

- Primary-section controller naming is inconsistent:
  - `manufacturers`, `contacts`, `services` → `use-{name}-primary-section.ts`
  - `admin` → `use-{name}-primary-controller.ts`
  Pick one pattern and align. `primary-section` is the majority.
- `admin` lacks `_validators.ts` and the `[id]/primary/section/route.ts` split. This is documented in `docs/patterns/ACCEPTED_EXCEPTIONS.md` (Exception 1) but should be cross-referenced here if it becomes load-bearing.
