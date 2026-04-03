Create Rules

        - Company name is  required
        - Company Name is unique
        - Idempotent
        - Transactional
        - All fields trimmed before persistence
        - Optional fields (agentName, website, phone, email) stored as null when empty
        - Uniqueness is case-insensitive (trim + lowercase comparison)

Create View
        - Separate page (/dashboard/manufacturers/new)
        - Save label: "Create Manufacturer"
        - Redirects to detail page after successful creation
        - Unsaved changes warning: "You have unsaved manufacturer changes. Leave this form without saving?"

Update Rules
        - Company name is required
        - Company name uniqueness enforced (excludes current record)
        - Optimistic concurrency control (expectedUpdatedAt prevents stale overwrites)
        - All fields trimmed before persistence
        - Optional fields stored as null when empty
        - Idempotent (mutation receipts)

Delete Rules
        - No delete if linked to a product.
        - Returns 404 if manufacturer not found
        - Optimistic concurrency check (expectedUpdatedAt) before delete
        - Delete confirmation message: "If this manufacturer is linked to products, deletion will be blocked."

List View UI / Controls

    Page State 
        - Table title top left
        - Sorting
        - Grouping
        - Search Bar
        - Columns Manager
        - + Form
        - Delete, saves and error handling notices
        - Reconciliation
        - Total row count
        - Row click Record entry

    List View
        - Pagination controls (page, totalPages, pageSize, next/previous)
        - Default sort: companyName ascending,
        - URL sync for table state (search, sort, grouping)
        - Empty state: "No manufacturers found."
        - Only Company Name is groupable

    Table Columns
        - Company Name
        - Agent Name
        - Website
        - Phone
        - Email

Record View Sections 

    Section 1

    Sectiom Header
        - Back Button

    Sub Header
        - Discard, Delete, Save buttons
        - Error handling & notices
        - Dirty draft satus / tracking

    Record View
        - Unsaved changes warning on navigation away
        - Optimistic concurrency: stale save triggers "Refresh and try again" error
        - Products count (read-only, displayed in side pane)
        - Main pane (3/4): Company Name, Agent Name, Website, Phone, Email
        - Side pane (1/4): Products count, Created, Updated

Additional Documentation

    Access Control
        - Manufacturers share tool access with Products (tool slug: "products")
        - All pages require tool access (requireManufacturersAccess)
        - All API routes enforce authorization via route policy

    Rate Limiting
        - Create: 20 requests per 10 minutes
        - Update: 20 requests per 10 minutes
        - Delete: 10 requests per 10 minutes
        - Primary section save: 40 requests per 10 minutes
        - List (GET): rate limited via query rate limiter

    Error / Page States
        - List page: shows DashboardErrorState if data load fails
        - Detail page: returns 404 (Next.js notFound) if record missing
        - Detail page: shows DashboardErrorState for other load failures
        - Detail error code: MANUFACTURER_DETAIL_LOAD_FAILED

    Race Condition Handling
        - If uniqueness pre-check passes but a concurrent create causes a Prisma P2002, it is caught and mapped to the same 409 "Company name must be unique" response

    Table Preferences
        - Persisted per user (table key: "manufacturers-main")
        - Stores sort direction, grouping enabled, group keys
        - Loaded server-side and hydrated into client

    Navigation
        - Create and detail pages support returnTo search param for back button
        - Defaults to /dashboard/manufacturers

    Input Aliases
        - agentName accepts body.name as a fallback (name is an alias for agentName on create/update)

    Mutation Telemetry
        - All mutations (create, update, delete) are wrapped in telemetry
        - Tracks: action scope, route, entityType (flooringManufacturer), entityId