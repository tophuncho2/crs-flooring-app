# Categories Domain — Errors

Brief stub.

- `CategoryExecutionError` — typed error class (narrow; only raised by normalizer assertions).
- Codes: `CATEGORY_UNIT_ROLE_MISSING`, `CATEGORY_RULE_UNKNOWN` (falls through to `DEFAULT_CATEGORY_UNIT_RULE` instead of throwing in most paths — only thrown where a caller explicitly opts into strict mode).
