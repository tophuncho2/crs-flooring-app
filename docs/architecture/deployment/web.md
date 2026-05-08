# Web — Railway Service

- [ ] **Toml location:** `apps/web/railway.toml`
- [ ] **Configured as code:** Railway dashboard → service "Config-as-code path" set to `apps/web/railway.toml`
- [ ] **Service role:** Next.js application (HTTP server)
- [ ] **Build command:** `npm run build:web`
- [ ] **Start command:** `npm run start:web`
- [ ] **Healthcheck path:** `/api/health`
- [ ] **Healthcheck timeout:** `100s`
- [ ] **Restart policy:** `ON_FAILURE`, max retries `10`
