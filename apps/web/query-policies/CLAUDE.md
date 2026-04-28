# `apps/web/query-policies/` — Named React Query Freshness Presets

Top-level home for named React Query freshness presets. Peer to `apps/web/transport/` and `apps/web/controllers/`.

## What lives here

Named tuples of `{ refetchIntervalMs, staleTimeMs }` that callers (list controllers today, record controllers later) thread into their `useQuery` calls. Examples shipped today:

- `LIST_FRESHNESS_LIVE` — 5s polling, 0 stale (chatty; for high-churn live views).
- `LIST_FRESHNESS_STANDARD` — 10s polling, 5s stale (default for opted-in list views; current pick for imports).
- `LIST_FRESHNESS_OFF` — no polling, 30s stale (matches global `<AppProviders>` defaults; explicit opt-out).

## Rules of placement

- Consumers import **named presets**, not raw numbers. Swapping the global cadence stays a one-line change.
- Each preset is a `{ refetchIntervalMs, staleTimeMs }` object. `refetchIntervalInBackground` stays at React Query's default (`false`) — no polling on hidden tabs — across every preset.
- New presets land here when a new module's list view (or, later, record view) needs a different cadence than the standard one. Don't define module-local copies; reuse the named preset or add a new shared one.
- `RECORD_FRESHNESS_*` presets land here when the record-view migration starts; the `LIST_*` prefix already separates concerns.
