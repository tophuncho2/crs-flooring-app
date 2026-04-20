# Properties — Data Layer (non-schema)

Brief stub.

- No scalar computed fields on the record itself.
- List row surfaces `workOrderCount` and `templateCount` via `COUNT(*)` aggregates on the child relations — child rows are openable but never edited from the property surface.
