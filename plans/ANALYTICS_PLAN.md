# Analytics Plan
## Operational Reporting, Completion Metrics, And Dashboard Data Standards

This file defines how analytics should work in the flooring platform.

It is focused on this project first, especially around:
- work-order completion
- pricing totals
- material/service totals
- shortage trends
- operational dashboards

---

# 1. Purpose

Analytics should convert operational activity into useful reporting.

The analytics layer should help answer:
- how many jobs were completed
- what the job revenue totals were
- how much material and service value moved through the system
- where shortages are occurring
- how work is progressing over time

---

# 2. Current Data Foundation

The system already includes analytics support tied to work orders.

Current data foundation includes:
- work orders
- work-order material items
- work-order service items
- rolled-up cost fields
- analytics table support

This is the foundation for dashboards, but not the full reporting system yet.

---

# 3. Analytics Source Of Truth

Analytics should be derived from operational truth, not arbitrary frontend state.

Primary sources:
- completed work orders
- work-order material rows
- work-order service rows
- future shortage status markers
- future send/export outcomes

---

# 4. Core Metrics Planned

## 4.1 Work-order completion metrics
- completed work orders
- open work orders
- draft work orders
- shortage work orders

## 4.2 Revenue-style metrics
- total template job value
- total work-order value
- total material value
- total service value

## 4.3 Operational metrics
- shortage count
- shortage frequency
- throughput over time
- completion volume by date

---

# 5. Completion Rule

Analytics should primarily reflect completed work, not just drafts.

Current intended rule:
- when a work order is manually marked complete
- analytics should update accordingly

This ensures dashboards reflect confirmed operational outcomes rather than incomplete planning activity.

---

# 6. Shortage Analytics

The system is planned to support shortage-based reporting.

Examples:
- orders with shortages
- most common shortage items
- shortage frequency by property or job type
- shortage-related resend volume

These should come from backend/domain truth, not UI-only signals.

---

# 7. Data Update Strategy

Analytics updates should occur in the backend/domain layer.

Options:
- synchronous updates for lightweight totals
- async worker-based aggregation later if complexity grows

For this app, initial analytics updates can remain close to domain mutations if they stay lightweight and accurate.

---

# 8. Dashboard Direction

The eventual analytics/dashboard page should support:
- completion summary
- job value totals
- material vs service totals
- shortage visibility
- date-based trend views

Later, it may also support:
- warehouse-level reporting
- property/management-company breakdowns
- completion cadence

---

# 9. Current Project-Specific Priorities

Highest-priority analytics work:

1. finalize completion rule
2. ensure work-order analytics totals remain accurate
3. define shortage analytics model
4. define which statuses count as dashboard-ready
5. define dashboard KPIs before building final UI

---

# 10. Definition Of Success

Analytics are successful when:
- totals are correct
- completed work is reflected reliably
- dashboards use stable backend-derived data
- the business can see meaningful operational performance

---

This file should be updated as the analytics layer becomes more detailed and dashboard requirements become more concrete.
