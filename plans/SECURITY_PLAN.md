# Security Plan
## Application, Infrastructure, Data, And Operational Security Standards

This file defines the security expectations for the flooring operations platform.

It is written primarily for this project, but the structure should be reusable for future internal company systems.

Even though this is an internal single-company app, it still needs real security discipline because it controls:
- operational workflows
- pricing
- inventory-related actions
- user accounts
- internal documents
- future automations and integrations

---

# 1. Security Goal

The goal is to make the system:
- safe for internal operational use
- resistant to preventable misconfiguration
- resilient against accidental misuse
- auditable
- production-worthy

---

# 2. Current Security Model

## 2.1 User roles
The current simplified model is:
- `BUILDER`
- `ADMIN`

### `BUILDER`
- full system access
- access to builder/admin management panel

### `ADMIN`
- full operational access
- no builder panel access

## 2.2 Current strengths
- auth is simpler than before
- route protection exists
- complex access-control drift has been reduced

## 2.3 Current weaknesses
- audit logging is still incomplete
- destructive-action controls are still basic
- env validation is not fully formalized
- observability and incident response are still immature

---

# 3. Authentication Standards

## 3.1 Requirements
- all protected routes require authenticated session
- builder-only routes require explicit builder check
- no implicit privilege by email hacks

## 3.2 Password/auth standards
- passwords must be stored securely
- auth secrets must be environment-managed
- login behavior should be logged at least at a basic operational level

## 3.3 Future enhancements
- password reset flow if needed
- account lockout/rate-limit strategy if login abuse becomes relevant
- optional MFA if operational risk grows

---

# 4. Authorization Standards

## 4.1 Rules
- authorization rules must be explicit
- role checks should be centralized
- permissions should match real operational needs

## 4.2 Current project-specific rule
Builder panel access is builder-only.

## 4.3 Do not allow
- UI-only authorization
- hidden route access without backend guard
- fragile email-based privilege rules

---

# 5. Route And API Security

## 5.1 Every protected route should
- authenticate
- authorize
- validate input
- call domain logic

## 5.2 API rules
- never trust client payload shape blindly
- never trust client totals or counts as truth
- return controlled errors

## 5.3 Current priority areas
Protect carefully:
- template sync
- destructive deletes
- builder panel
- inventory-related updates
- future send/export endpoints

---

# 6. Data Integrity Security

Security is not only about access. It is also about preventing bad or dangerous data actions.

## 6.1 Required protections
- transactions for multi-step writes
- explicit sync modes
- optimistic concurrency for important edits
- no silent destructive overwrite behavior

## 6.2 Current project-specific risks
- work-order edits and syncs must not silently stomp each other
- future inventory allocation must be protected against double-processing
- future send workflow must be idempotent

---

# 7. Secrets Management

## 7.1 Rules
- never commit secrets
- keep secrets in Railway vars or ignored local env files
- document secret ownership
- rotate exposed secrets if compromised

## 7.2 Sensitive values include
- auth secrets
- DB URLs
- Redis URLs
- storage credentials
- n8n keys
- external integration keys

---

# 8. Environment Safety

## 8.1 Rules
- local must not use production credentials by default
- staging must be isolated from production
- production secrets must never be reused casually

## 8.2 Required configuration discipline
- `.env.example` should be complete
- env validation should fail early on missing critical vars

---

# 9. File And Storage Security

For file generation and uploads:
- validate content type
- validate file size
- isolate buckets by environment where possible
- avoid trusting browser-provided file metadata alone

Generated files like:
- order slip
- picking slip

should be stored with controlled access and referenced intentionally.

---

# 10. Audit Logging

## 10.1 Must log eventually
- template sync actions
- deletes
- work-order status changes
- inventory allocation changes
- shortage events
- completion events
- builder/admin actions

## 10.2 Why it matters
This app is becoming operationally authoritative.
Without audit trails:
- mistakes are harder to trace
- accountability is weak
- debugging becomes much slower

---

# 11. Destructive Action Standards

Destructive actions should require:
- clear user intent
- explicit backend behavior
- audit event if important
- protection from accidental silent cascades

High-risk destructive actions include:
- delete work order
- delete template
- future inventory corrections
- future send/export resets

---

# 12. Integration Security

Future integrations may include:
- n8n
- file generation/storage
- external notifications
- vendor or partner systems

Rules:
- keep integration keys isolated
- use minimal access
- verify webhook authenticity where applicable
- never let external systems become business-truth owners

---

# 13. Worker Security

Workers should:
- have only the env vars they need
- remain private services
- use Redis and Postgres safely
- log important job actions

They should not be public-facing unless there is a specific reason.

---

# 14. Infrastructure Security

On Railway:
- restrict project access
- keep internal services private
- keep only necessary domains public
- separate staging and production

On Postgres:
- control direct access
- verify backups
- understand restore path

On Redis:
- keep private
- isolate by environment

---

# 15. Current Project-Specific Priorities

Highest-priority security work for this app:

1. formal env validation
2. audit logging for critical operational actions
3. stronger destructive-action controls
4. concurrency protection on key saves
5. secure file handling for generated documents
6. worker/idempotency safety when async flows are added

---

# 16. Definition Of Success

Security is successful when:
- access is explicit
- secrets are controlled
- destructive actions are safe
- important actions are auditable
- environments are isolated
- integrations are bounded

---

This file should be updated whenever security expectations, integrations, or operational sensitivity increases.
