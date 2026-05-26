// Page-size config for the paginated cut-log list shown in the inventory
// record view's cut-log section. Declared in domain so both the use case
// / route validator and the client request helper read the same constants.

export const INVENTORY_CUT_LOG_PAGE_SIZE = 15
export const INVENTORY_CUT_LOG_MAX_PAGE_SIZE = 50

// Page-size config for the standalone cut-logs ledger list view
// (`/dashboard/cut-logs`). Separate from the inventory-record cut-log section
// constants above.
export const CUT_LOGS_LIST_PAGE_SIZE = 25
export const CUT_LOGS_LIST_MAX_PAGE_SIZE = 100
