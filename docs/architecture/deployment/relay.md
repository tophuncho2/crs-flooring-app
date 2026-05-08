# Relay — Railway Service

- [ ] **Toml location:** `apps/relay/railway.toml`
- [ ] **Configured as code:** Railway dashboard → service "Config-as-code path" set to `apps/relay/railway.toml`
- [ ] **Service role:** Polls the `QueueOutboxEvent` outbox table, validates payloads, dispatches BullMQ jobs (with deterministic `jobId`), and marks rows dispatched / reschedules retries; HTTP server exists only for healthcheck
- [ ] **Build chain:** `db → domain → application → lib → relay` (isolated from web/worker so unrelated build failures don't cascade)
- [ ] **Build command:** `npm run build:relay`
- [ ] **Start command:** `npm run start:relay`
- [ ] **Healthcheck path:** `/healthz`
- [ ] **Healthcheck timeout:** `100s`
- [ ] **Restart policy:** `ON_FAILURE`, max retries `10`

## Tuning variables (Railway service variables)

- [ ] **`RELAY_BATCH_SIZE = 20`** — number of outbox events claimed per poll. 20 balances fewer round trips against backpressure risk; raise only if outbox lag shows up during traffic spikes.
- [ ] **`RELAY_POLL_INTERVAL_MS = 2000`** — how often the relay polls the outbox. 2s feels near-real-time without hammering the DB; lower for sub-second dispatch, raise if DB poll cost shows up.
- [ ] **`RELAY_CLAIM_TTL_MS = 30000`** — how long a claim lasts before another relay can re-claim. If a relay crashes mid-claim, another picks it up after 30s — generous given typical dispatch latency.
- [ ] **`RELAY_MAX_ATTEMPTS = 5`** — retry budget before marking an outbox event `EXHAUSTED`. Standard for outbox dispatch retries.
