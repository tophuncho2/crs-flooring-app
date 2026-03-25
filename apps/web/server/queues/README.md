Queue payload contracts live here today. There is no active queue runtime in the current production path.

Current state:
- API routes and application use cases run synchronously.
- Job payload types may be defined here to keep future worker entrypoints stable.

If a queue runtime is introduced later, this folder should add:
- connection configuration
- queue names and payload contracts
- enqueue helpers used by API routes
- retry/backoff defaults
