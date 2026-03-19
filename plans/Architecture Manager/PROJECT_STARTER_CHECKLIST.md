# Project Starter Checklist
## Reusable Startup Checklist For Internal Company Systems

This file is a reusable startup checklist for this project and future internal systems.

It exists to make sure new builds start cleanly with the right structure, standards, and infrastructure decisions from the beginning.

---

# 1. Product Definition

- define the main operational purpose
- define the primary records
- define child records
- define the main workflow
- define what “complete” means

---

# 2. Architecture Setup

- choose single-repo or split-repo strategy
- define app/service boundaries
- define folder structure
- define shared-vs-local code strategy
- define route/domain separation standard

---

# 3. Data Model Setup

- define main entities
- define ownership relationships
- define copy vs reference rules
- define pricing ownership
- define status model
- define analytics ownership

---

# 4. Infrastructure Setup

- Postgres selected and isolated by environment
- Redis planned and isolated by environment
- Railway service topology planned
- worker service planned
- storage planned if needed
- n8n role decided if used

---

# 5. Config Setup

- `.env.example` created
- env variables documented
- secrets strategy defined
- env validation planned

---

# 6. Build Standards Setup

- create planning files
- define coding standards
- define folder standards
- define mutation safety standards
- define testing expectations

---

# 7. Quality Setup

- lint configured
- build works
- test strategy planned
- deployment flow planned
- backup/restore plan known

---

# 8. Definition Of Success

The startup process is successful when:
- the repo has clean structure
- the workflow is defined before coding too much
- infra decisions are documented
- the project can scale cleanly from day one

---

This file should be reused at the start of future internal projects.
