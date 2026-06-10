// Cross-layer config for the labor-payments list view. Declared in domain
// because these values are referenced by both server-side use cases / route
// validators (in @builders/application) and the client-side controller / data
// wrapper (in apps/web/modules/labor-payments/).

export const LIST_LABOR_PAYMENTS_PAGE_SIZE = 50
export const LIST_LABOR_PAYMENTS_MAX_PAGE_SIZE = 200
