# Categories — Data Layer (non-schema)

- No computed fields stored. Conversion arithmetic is pure domain (see `../domain/unit-conversion.md`).
- Read-repository shape: `CategoryRecord` includes `{ stockUnit, sendUnit, coverageAvailableUnit, itemCoverageUnit, serviceUnit }` all expanded to `{ id, slug, name, abbreviation }`.
- Used by every read path that normalizes inventory / product / cut-log / material-item records into their canonical shapes (so the consumer has the UoM labels without a second query).
