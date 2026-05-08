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
