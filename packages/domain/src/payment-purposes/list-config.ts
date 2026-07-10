// Cross-layer config for the payment-purposes list view. Declared in domain
// because these values are referenced by both server-side use cases / route
// validators (in @builders/application) and the client-side controller / data
// wrapper (in apps/web/modules/payment-purposes/).

export const LIST_PAYMENT_PURPOSES_PAGE_SIZE = 50
export const LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE = 200
