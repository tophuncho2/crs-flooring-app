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