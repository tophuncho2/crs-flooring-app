// Cross-layer config for the payments list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/payments/).

export const LIST_PAYMENTS_PAGE_SIZE = 25
export const LIST_PAYMENTS_MAX_PAGE_SIZE = 100
