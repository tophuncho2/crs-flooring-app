# Categories Domain — Rules

Brief stub. Seeded, read-only this sweep.

- `isCategorySlug(value)` — narrow to seeded slugs.
- `assertCategoryHasStockAndSendUnits(category)` — throws if any UoM role required for conversion is null. Called at the top of every read-repo normalizer that will hand the record to a unit-conversion helper.
- No write validators: categories + UoMs are seeded and not user-editable in this sweep.
