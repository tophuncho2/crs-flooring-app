# Worker — Railway Service

- [ ] **Toml location:** `apps/worker/railway.toml`
- [ ] **Configured as code:** Railway dashboard → service "Config-as-code path" set to `apps/worker/railway.toml`
- [ ] **Service role:** BullMQ job processor (no HTTP server)
- [ ] **Build chain:** `db → domain → application → lib → worker` (isolated from web/relay so unrelated build failures don't cascade)
- [ ] **Build command:** `npm run build:worker`
- [ ] **Start command:** `npm run start:worker`
- [ ] **Healthcheck:** none — liveness enforced by BullMQ `lockDuration` (default 60s); a wedged job releases its lock and another worker picks it up
- [ ] **Restart policy:** `ON_FAILURE`, max retries `10`

## Tuning variables (Railway service variables)

- [ ] **`MATERIALIZE_WORKER_CONCURRENCY = 3`** — parallel materialize jobs. Safe to bump above 1: `inventoryNumber` is sequence-driven (no race), the per-import-entry lock means different batches run in parallel, and the materialize TX is short. 3 gives real parallelism without being aggressive; raise as throughput demands.
- [ ] **`MATERIALIZE_WORKER_LOCK_DURATION_MS = 60000`** — BullMQ job lock duration. 60s is plenty of slack for the short materialize TX (read + bulk insert + update).
- [ ] **`WORK_ORDER_FILE_GENERATION_WORKER_CONCURRENCY = 2`** — parallel file-gen jobs. Conservative starting point; only safe once WO/file status decoupling lands so two files for the same WO don't race the WO row's status field. Bump higher only after watching parallel runs in production.
- [ ] **`WORK_ORDER_FILE_GENERATION_WORKER_LOCK_DURATION_MS = 180000`** — BullMQ job lock duration. Puppeteer renders are typically 10–30s; 3 min gives generous slack so a slow render never lets the lock expire mid-flight.
