# Security Manager

This folder is the planning and assessment center for project security.

Scope:
- authentication
- authorization
- session security
- API and route protection
- secrets and environment handling
- storage and file-upload security
- database and data protection
- auditability and incident response
- operational hardening for deployment and scaling

Primary objective:
Build this system into a scalable, trustworthy, safe, reliable, and strongly protected application with explicit controls instead of implicit trust assumptions.

Working rules for this area:
- security decisions must be documented here before broad rollout
- critical findings should be tracked with severity and remediation status
- authn and authz changes should be reviewed as system-level changes, not isolated route edits
- security posture should be reassessed after major schema, API, storage, or deployment changes

Current assessment:
- [overall-assessment.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Security%20Manager/assessment/overall-assessment.md)
- [strengths-weaknesses.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Security%20Manager/assessment/strengths-weaknesses.md)
