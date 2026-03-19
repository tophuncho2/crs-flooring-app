# Data Model Plan
## Operational Meaning Of Core Tables And Relationships

This file explains the intended meaning of the data model in business terms.

It is not just a schema note. It should be used before:
- Prisma changes
- relation changes
- sync-rule changes
- analytics changes

---

# 1. Purpose

The purpose of this file is to define:
- what major tables represent
- which records own which children
- when data is copied
- when data is referenced
- what values are source-of-truth vs derived

---

# 2. Core Entities

## Users
Internal authenticated users of the system.

## Management Companies
Parent business grouping for properties.

## Properties
Operational job locations.
Each property belongs to one management company.

## Products
Material products used in flooring operations.

## Services
Service definitions used in service line items.

## Templates
Reusable job configurations.

## Template Items
Material rows stored under a template.

## Template Service Items
Service rows stored under a template.

## Work Orders
Live operational records created from templates or forms.

## Work Order Items
Material rows stored under a work order.

## Work Order Service Items
Service rows stored under a work order.

## Inventory
Real warehouse stock records.

## Cut Logs
Usage records tied to inventory and work orders.

## Analytics
Rolled-up operational totals for reporting.

---

# 3. Ownership Rules

## Management Company → Property
One management company has many properties.
Each property belongs to one management company.

## Property → Template
One property can have many templates.
Each template belongs to one property.

## Property → Work Order
One property can have many work orders.
Each work order belongs to one property.

## Template → Template Items / Service Items
Template owns its material and service child rows.

## Work Order → Work Order Items / Service Items
Work order owns its material and service child rows.

## Work Order → Analytics
Each work order should have associated analytics totals.

---

# 4. Copy vs Reference Rules

## 4.1 Templates to work orders
Templates are copied into work orders.

That means:
- rows are duplicated into work-order tables
- pricing is copied
- work order becomes independent
- template remains reusable

## 4.2 No live linkage after copy
Template changes do not automatically change existing work orders.

## 4.3 Why this matters
This preserves operational history and allows work-order edits without corrupting templates.

---

# 5. Pricing Ownership

## 5.1 Template pricing
Template rows store pricing for reusable jobs.

## 5.2 Work-order pricing
Work-order rows store their own pricing after copy.

## 5.3 Rule
Work-order pricing must remain editable independently after creation.

---

# 6. Derived Values

## 6.1 Template totals
Derived from:
- template material rows
- template service rows

## 6.2 Work-order totals
Derived from:
- work-order material rows
- work-order service rows

## 6.3 Analytics totals
Persisted derived values for reporting.

These should be updated by backend/domain logic, not by arbitrary frontend calculations alone.

---

# 7. Inventory Relationship Rules

Inventory should support:
- allocation to work-order rows
- deduction when used
- cut-log traceability

Inventory truth should remain operationally reliable and should not depend only on UI assumptions.

---

# 8. Status Ownership

Statuses should be treated as part of the domain model, not UI-only labels.

This applies especially to:
- work-order statuses
- shortage state
- vacancy state
- inventory sufficiency markers

---

# 9. Future Model Decisions Still Needed

The following still require final standardization:
- full work-order lifecycle statuses
- shortage handling fields
- send/export status model
- inventory allocation ownership and row linkage rules
- audit/event model
- formula/calculated-field ownership

---

# 10. Definition Of Success

The data model is successful when:
- every major table has clear meaning
- ownership is explicit
- copy vs reference behavior is clear
- pricing behavior is stable
- analytics are trustworthy
- future schema changes can be made with confidence

---

This file should be updated whenever the operational meaning of the schema changes.
