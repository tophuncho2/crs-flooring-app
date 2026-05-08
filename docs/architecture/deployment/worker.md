# Worker — Railway Service

- [ ] **Toml location:** `apps/worker/railway.toml`
- [ ] **Configured as code:** Railway dashboard → service "Config-as-code path" set to `apps/worker/railway.toml`
- [ ] **Service role:** BullMQ job processor (no HTTP server)
- [ ] **Build chain:** `db → domain → application → lib → worker` (isolated from web/relay so unrelated build failures don't cascade)
- [ ] **Build command:** `npm run build:worker`
- [ ] **Start command:** `npm run start:worker`
- [ ] **Healthcheck:** none — liveness enforced by BullMQ `lockDuration` (default 60s); a wedged job releases its lock and another worker picks it up
- [ ] **Restart policy:** `ON_FAILURE`, max retries `10`
