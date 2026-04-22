# Management Companies — Data Layer (non-schema)

Brief stub.

- No scalar computed fields on the record itself.
- List row surfaces `propertyCount` via a `COUNT(*)` aggregate on `properties` — children are openable, never edited from the mgmt-company surface.
