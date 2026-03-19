# Environment Variables
## Minimum Variables For Railway App And Future Worker Alignment

This file tracks the environment-variable contract needed to bridge the Railway server, the app, Redis, Postgres, and future workers.

## Shared Variables

```env
NODE_ENV=
APP_URL=

DATABASE_URL=
DIRECT_URL=

REDIS_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

QUEUE_PREFIX=
WORKERS_ENABLED=
```

## App Service Variables

```env
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## Future BullMQ Worker Variables

```env
WORKER_CONCURRENCY=
WORKER_NAME=
```

## Rules

- use the same variable names locally and in Railway
- keep queue prefixes environment-specific
- never hardcode Railway hostnames in application code
- treat `WORKERS_ENABLED=false` as the default until workers are installed
