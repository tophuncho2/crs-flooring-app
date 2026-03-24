There is no active worker runtime in the current production architecture.

This app currently executes imports and template sync flows synchronously in the API/application path. This folder is reserved for a future worker service if background execution becomes necessary.

If workers are introduced later, they should contain:
- worker bootstrap entrypoint
- queue processors
- domain-specific job handlers that call application use cases only
- worker-only instrumentation and concurrency config
