# Single-Section → Domain — Recommended Additions

> Checklist of topics still to document under `single-section/domain/`. Keep each entry short; expand into its own file only when a pattern stabilizes.

- [ ] Naming rules for the single-section domain triad (`{Name}Form`, `EMPTY_{NAME}_FORM`, `to{Name}Form`). Which is required, which is optional, and the file they live in (`types.ts`).
- [ ] Row vs Detail distinction — when a module needs both (contacts has `ContactRow` + `ContactDetail`; manufacturers and services only have `Row`). Document when to introduce `Detail`.
- [ ] Validator convention — `validate{Name}Form` placement in `types.ts`, return shape, and how the controller consumes it. Services and contacts have one; manufacturers does not.
- [ ] Delete-rules contract — every single-section module with a delete surface exports `is{Name}DeleteBlocked` + `get{Name}DeleteBlockedMessage` from `{name}-rules.ts`. Confirm and spec it here.
- [ ] Module-level enum constants (e.g. `CONTACT_TYPE_LABELS`) — where they live and who may import them (UI is fine; avoid controller-only consumption).
- [ ] Required vs optional per-module domain files (`types.ts` required; `*-rules.ts` required when mutations exist).
- [ ] Admin remediation path — align admin with the triad pattern, or carve out a documented exception here so the outlier is explicit.
- [ ] Link back to `layers/domain/EXPORTS.md` for the abstract contract, and keep this doc strictly concrete to single-section.
