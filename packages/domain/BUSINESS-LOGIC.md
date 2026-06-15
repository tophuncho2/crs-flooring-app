# Business Logic

**Briefing:** This file explains *why* something is the way it is — rules written in plain words that come straight from the client's or developer's mouth, then enforced in the domain. It is the human-readable companion to the predicates, message builders, and zod payloads under `packages/domain/`. When a rule here has a code home, point to it; when it's just intent, say so plainly.

---

<!-- Add rules below. One rule per entry: the plain-English statement, who it came from, and where it's enforced. -->

## Properties

- [ ] A property belongs to exactly one management company at a time — it can never be linked to two at once.

## Inventory

- [ ] Every inventory record is linked to a parent product — inventory can never exist without one.
- [ ] An inventory adjustment linked to both a work order AND a WO material item is an assignment.

## Products

- [ ] A product must be linked to a category.

