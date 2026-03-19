# Master Plan
## Root Control File For The `plans/` System

This root is now intentionally small.
It should only contain:
- [ASSESSMENT_TO_100_PERCENT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/ASSESSMENT_TO_100_PERCENT.md)
- [FIRST_ACTIONS_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/FIRST_ACTIONS_CHECKLIST.md)
- [MASTER_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/MASTER_PLAN.md)
- [STRENGTHS_VS_WEAKNESSES.md](/Users/ottohull/builderswebapp/builderswebapp/plans/STRENGTHS_VS_WEAKNESSES.md)

Everything else should live inside a manager folder.

---

# 1. Purpose

This planning system exists to direct the flooring platform toward a build that is:
- professional
- scalable
- safe
- secure
- fast
- reliable
- decluttered

The root files are executive roll-ups.
The manager folders are the operating system for actual planning, assessments, and category-specific execution.

---

# 2. Manager Map

## [Architecture Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Architecture%20Manager)
Owns the system blueprint, build standards, shared architecture patterns, and Codex execution rules.

Primary entry:
- [Architecture Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Architecture%20Manager/README.md)

## [Program Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Program%20Manager)
Owns project execution sequencing, readiness gates, and cross-manager delivery tracking.

Primary entry:
- [Program Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Program%20Manager/README.md)

## [Flooring Domain Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Flooring%20Domain%20Manager)
Owns flooring-specific product truth, workflow definition, and analytics direction.

Primary entry:
- [Flooring Domain Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Flooring%20Domain%20Manager/README.md)

## [Prisma Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager)
Owns schema quality, migration discipline, table meaning, and Postgres planning.

Primary entry:
- [Prisma Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/README.md)

## [Platform Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager)
Owns deploy, env, observability, Redis, workers, Railway topology, and platform readiness.

Primary entry:
- [Platform Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager/README.md)

## [Security Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Security%20Manager)
Owns security posture, hardening plans, and security assessments.

Primary entry:
- [Security Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Security%20Manager/README.md)

## [Access Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Access%20Manager)
Owns auth, roles, permissions, verification, and builder/admin governance.

Primary entry:
- [Access Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Access%20Manager/README.md)

## [Dashboard Shell Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Dashboard%20Shell%20Manager)
Owns nav behavior, preferences, hotkeys, and cross-page workspace behavior.

Primary entry:
- [Dashboard Shell Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Dashboard%20Shell%20Manager/README.md)

## [Shared Variables Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Shared%20Variables%20Manager)
Owns config values, constants, shared defaults, and shared-value cleanup.

Primary entry:
- [Shared Variables Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Shared%20Variables%20Manager/README.md)

## [Testing Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager)
Owns test strategy, coverage rollout, matrices, and testing execution.

Primary entry:
- [Testing Manager README](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/README.md)

---

# 3. Root Update Rules

- Root files should stay short and managerial.
- Root files should summarize manager posture, not duplicate manager docs.
- New category documents should be created inside a manager folder, not in the root.
- If a new category emerges, create a new manager folder with a `README.md` before adding deeper files.
- When a manager assessment changes materially, update the four root roll-up files.

---

# 4. Current Management Priority Order

1. Security containment and access control cleanup.
2. Workflow truth finalization for templates, work orders, shortages, and completion.
3. Prisma and platform hardening around drift, migrations, workers, and observability.
4. Testing expansion from narrow coverage to true release protection.
5. UI and shell decluttering so the system scales cleanly operationally.
