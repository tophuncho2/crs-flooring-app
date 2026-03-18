# Key Features
## Customer-Facing System Overview

This document explains the key drivers and major features of the flooring operations platform from the user and business perspective. It is intended to describe what the system does, why it matters, and how the core workflow is expected to operate as the platform moves toward full completion.

---

# 1. System Purpose

The system is designed to serve as the company’s internal flooring operations platform.

Its purpose is to:
- store reusable job configurations
- create and manage work orders quickly
- track pricing and revenue expectations
- connect work orders to inventory
- help users process and send orders
- detect shortages before fulfillment is completed
- update operational and analytics data as work is completed

The platform is meant to replace fragmented manual workflows with one structured operational system.

---

# 2. Key Driver Of The System

## Reusable Templates

The main driver of the platform is the ability to store reusable templates.

A template is a reusable job configuration that includes:
- the main template record
- material item rows
- service item rows

This allows users to define standard jobs once and reuse them repeatedly instead of rebuilding jobs from scratch every time.

---

# 3. Template Structure

Each template contains:

## 3.1 Primary template record
The template header stores the main job-level setup, such as:
- property or location context
- warehouse context
- instructions
- job notes
- optional pad type or other supporting product references

## 3.2 Material item rows
These rows represent the physical products needed for the job.

Each material row is expected to hold:
- product
- quantity
- unit price
- notes
- any supporting operational values needed for fulfillment

## 3.3 Service item rows
These rows represent labor or service-based parts of the job.

Each service row is expected to hold:
- service name or linked service
- unit
- quantity
- unit price
- notes

---

# 4. Template Pricing And Revenue View

Each item row and service row stores pricing.

That pricing rolls up into the template so the system can show the full expected job value.

This rolled-up total represents:
- the total customer-facing value of the job
- the expected revenue for the job
- what can be referred to as the invoice cost

This gives users immediate visibility into the projected value of a job before a work order is ever created.

---

# 5. Repeated Work Order Creation From Templates

Users can repeatedly create new work orders from templates.

This is one of the most important features in the system because it allows the business to:
- standardize repeat jobs
- speed up work-order creation
- reduce manual entry
- preserve known pricing structures
- keep operational setup consistent

The system uses a copy model:
- template rows are copied into work-order rows
- the work order becomes independent after creation
- future edits to the work order do not change the template

This makes templates reusable while allowing work orders to remain operationally flexible.

---

# 6. Work Order Processing Plan

Once a work order is created, the platform is intended to support a full operational workflow.

That workflow includes:
- preparing the work order
- allocating inventory
- deducting inventory
- generating fulfillment files
- detecting shortages
- updating operational status
- final completion
- analytics updates

---

# 7. Inventory Allocation And Deduction

Once a work order is set, users will be able to automate the process of inventory allocation and deduction.

This process is planned to include:
- matching work-order item rows to inventory
- allocating inventory to those rows
- deducting inventory when the order is processed
- creating cut logs as part of inventory usage tracking

This is important because it connects the planning side of the job directly to real warehouse inventory.

---

# 8. Cut Logs

Cut logs are intended to record how inventory is actually used during fulfillment.

They provide operational traceability by showing:
- what inventory item was used
- how much was used
- what remained after the cut
- which work order and item row the cut belongs to

Cut logs are a key part of making inventory deduction and fulfillment accurate.

---

# 9. Generated Files

As part of work-order processing, the system is planned to generate operational files for users.

These generated files include:
- order slip
- picking slip
- related fulfillment documents as needed

These files are intended to support warehouse and field operations and make the order ready to act on.

---

# 10. Inventory Shortage Detection

The system is intended to detect inventory shortages at the row level and at the full order level.

## 10.1 Item-level shortage logic
If a user adds an item to the work order and the inventory is insufficient for that item:
- that item row will receive a shortage status marker

## 10.2 Order-level shortage logic
If any item row has the shortage marker:
- the entire order will be marked as shortage
- the order must be corrected and resent

This gives users a clear operational signal that the work order is not ready for successful fulfillment.

---

# 11. Resend Requirement

If a shortage exists, the order should not be considered fully processed.

Instead:
- the shortage must be addressed
- the order must be resent after correction

This ensures that incomplete or invalid fulfillment attempts do not silently move forward as completed work.

---

# 12. Work Order Database Updates

Once the order is processed, the database is expected to update the work order with all necessary fields and status changes.

That includes:
- fulfillment-related updates
- generated file references
- shortage or success markers
- inventory allocation or deduction results
- any resulting operational metadata

This allows the work order to remain the live operational record for the job.

---

# 13. Completion Flow

After all required processing is done and the work is fully completed:
- the user will manually mark the order as complete

This manual completion step is important because it allows final human confirmation that the work has actually finished.

Once marked complete:
- the work order status updates
- the analytics layer updates

---

# 14. Analytics Plan

Completed work orders will feed the analytics side of the platform.

This is intended to support reporting such as:
- completed jobs
- job value totals
- operational throughput
- shortage trends
- material and service totals
- future dashboard views

The analytics layer should reflect real completed operational activity, not just draft planning.

---

# 15. End-To-End Workflow Summary

The planned end-to-end business workflow is:

1. A user creates and stores a reusable template.
2. The template contains a main record, material item rows, and service item rows.
3. Each row stores pricing.
4. The template rolls pricing up into a total job value or invoice cost.
5. A user creates a new work order from that template.
6. The template data is copied into the work order.
7. The work order is prepared and processed operationally.
8. Inventory is allocated and deducted.
9. Cut logs are created as inventory is used.
10. Order slip and picking slip files are generated.
11. The system checks for shortages.
12. If any line is short, the line is marked shortage and the whole order is marked shortage.
13. The order must be corrected and resent if shortages exist.
14. Once processing is successful, the work order record is updated.
15. When the job is actually finished, the user marks it complete.
16. Completion updates the analytics layer.

---

# 16. Why These Features Matter

These features matter because they allow the company to:
- reuse job configurations instead of rebuilding them
- keep pricing visible and standardized
- create work orders faster
- connect work orders directly to real inventory
- identify shortages before completion
- generate operational paperwork automatically
- preserve a clean operational record
- report on completed work accurately

---

# 17. Current vs Planned State

## Current
The platform already supports the foundation for:
- templates
- work orders
- material/service rows
- per-row pricing
- template-to-work-order copying

## Planned
The next major operational capabilities are:
- automated inventory allocation
- inventory deduction
- cut log automation
- generated fulfillment files
- shortage-based status handling
- resend logic
- completion-driven analytics updates

---

# 18. Definition Of Success

This feature set will be considered successful when:
- templates can be reused confidently
- users can build work orders quickly
- pricing totals are clear and reliable
- inventory usage is tracked accurately
- shortages are visible immediately
- file generation supports real operational work
- processed orders update cleanly
- completed jobs feed analytics correctly

---

# 19. Reusable Template For Future Systems

This document structure can be reused for future internal systems by describing:
- the primary driver of the system
- the main records
- the child records
- how values roll up
- how users repeat workflows
- what automation happens next
- what completion means
- how analytics are affected

---

This file should be updated as the workflow becomes more detailed and as the platform moves closer to full operational completion.
