# Access Management Planning
## Canonical Home For Auth, Roles, Restrictions, And Builder Governance

This folder is the source of truth for planning work related to identity, access, and internal admin control.

Use this folder when the work is primarily about:
- authentication and session behavior
- role-based access rules
- account verification and restriction rules
- builder/admin user management
- access boundaries around APIs, pages, and tools

This folder exists because access behavior is spread across multiple layers:
- auth routes in `app/api/auth/`
- account-sensitive routes in `app/api/account/`
- builder admin routes in `app/api/builder/`
- auth helpers in `server/auth/`
- builder control UI in `app/dashboard/builder/`

Keep security, deployment, and environment standards in the existing top-level plans.
Use this folder for the app-specific operational rules that answer:
- who can sign up
- who can access which tools
- who can manage users
- how restricted or unverified users are handled
- how builder/admin controls should evolve

Recommended future files in this folder:
- access-rules-matrix.md
- builder-panel-governance.md
- registration-verification-plan.md
- route-access-audit.md

Assessment files:
- [overall-assessment.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Access%20Manager/assessment/overall-assessment.md)
- [strengths-weaknesses.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Access%20Manager/assessment/strengths-weaknesses.md)
