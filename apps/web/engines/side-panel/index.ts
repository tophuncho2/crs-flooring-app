// Canonical side-panel engine. One self-contained import surface for the
// mechanics every side panel shares: freshness (refresh + invalidation), the
// after-mutation patch contract, the view shell, and the error/notice model.
//
// First consumer: the inventory hub side panel. The host/open-state controller
// and the mutation bridge are intentionally not built yet — they need a second
// consumer (the property-hub migration) to design against, rather than being
// shaped by a single caller.
export * from "./controllers/use-side-panel-freshness"
export * from "./contracts/side-panel-patch"
export * from "./shell"
export * from "./feedback"
