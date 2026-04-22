# Categories — model

Two orthogonal strategy registries, both keyed on category slug:

- [`coverage-conversions.md`](./coverage-conversions.md) — how `availableBalance` (stock unit) converts to `availableCoverage` (coverage unit). Consumed by inventory + cut-log normalizers.
- [`fulfillment-strategies.md`](./fulfillment-strategies.md) — which cut-log field work-order material items sum to compute `quantityAssigned`. Consumed by future work-order material-item normalizer.

Each `sets/<bucket>/<category>/breakdown.md` declares its strategy slugs. Changing a conversion or adding a category = one entry in the registry, no consumer changes.
